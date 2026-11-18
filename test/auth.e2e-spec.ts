// Переменные задаём ДО создания приложения: ConfigModule читает их при init,
// а .env в CI отсутствует.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'lab19-e2e-test-secret';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'Admin123!';
process.env.DEMO_EMAIL = 'user@example.com';
process.env.DEMO_PASSWORD = 'User123!';

// Инициализация NestJS + bcrypt-сид на холодной файловой системе CI может
// занимать больше стандартных 5 секунд — увеличиваем таймаут хуков.
jest.setTimeout(60000);

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Lab 19 application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> 200 и status: ok', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('POST /auth/login -> выдаёт JWT для администратора', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin123!' })
      .expect(200);

    expect(typeof response.body.access_token).toBe('string');
    expect(response.body.token_type).toBe('Bearer');
  });

  it('POST /auth/login -> 401 при неверном пароле', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong-password' })
      .expect(401);
  });

  it('GET /tasks без токена -> 401', async () => {
    await request(app.getHttpServer()).get('/tasks').expect(401);
  });
});
