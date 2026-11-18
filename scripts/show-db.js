/* eslint-disable */
/**
 * Показывает содержимое базы lab17.sqlite:
 * пользователей (с bcrypt-хешами), роли и задачи.
 *
 * Запуск: npm run db:show
 */
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // .env не обязателен: используются значения по умолчанию.
}

const databasePath = path.resolve(
  __dirname,
  '..',
  process.env.DB_PATH || 'data/lab17.sqlite',
);

if (!fs.existsSync(databasePath)) {
  console.error(`База данных не найдена: ${databasePath}`);
  console.error('Сначала запустите приложение: npm run start:dev');
  process.exit(1);
}

const db = new Database(databasePath, { readonly: true });

const users = db
  .prepare(
    `SELECT u.id,
            u.email,
            u.name,
            u.passwordHash,
            u.createdAt,
            GROUP_CONCAT(r.name, ', ') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.userId = u.id
       LEFT JOIN roles r ON r.id = ur.roleId
      GROUP BY u.id
      ORDER BY u.id`,
  )
  .all();

const roles = db
  .prepare(
    `SELECT r.id, r.name, COUNT(ur.userId) AS usersCount
       FROM roles r
       LEFT JOIN user_roles ur ON ur.roleId = r.id
      GROUP BY r.id
      ORDER BY r.id`,
  )
  .all();

const tasks = db
  .prepare(
    `SELECT t.id, t.title, t.isCompleted, t.ownerId, u.email AS ownerEmail
       FROM tasks t
       LEFT JOIN users u ON u.id = t.ownerId
      ORDER BY t.id`,
  )
  .all();

console.log(`\nБаза данных: ${databasePath}\n`);

console.log('=== РОЛИ ===');
for (const role of roles) {
  console.log(`#${role.id} ${role.name} (пользователей: ${role.usersCount})`);
}

console.log('\n=== ПОЛЬЗОВАТЕЛИ ===');
for (const user of users) {
  console.log(`#${user.id} ${user.email} | ${user.name}`);
  console.log(`   роли: ${user.roles || '(нет)'}`);
  console.log(`   passwordHash: ${user.passwordHash}`);
}

console.log('\n=== ЗАДАЧИ ===');
if (tasks.length === 0) {
  console.log('(задач нет)');
} else {
  for (const task of tasks) {
    console.log(
      `#${task.id} "${task.title}" | выполнена: ${
        task.isCompleted ? 'да' : 'нет'
      } | владелец: ${task.ownerEmail ?? task.ownerId}`,
    );
  }
}

db.close();
