# ЛР №19. Деплой в облако и CI/CD (GitHub Actions)

Проект — копия приложения из ЛР №17 (и ЛР №18), подготовленная к облачному
деплою и автоматическому пайплайну.

## Что изменено по сравнению с ЛР №17

| Файл | Что сделано |
| --- | --- |
| `src/main.ts` | порт берётся из `PORT`, `app.listen(port, '0.0.0.0')` |
| `Procfile` | `web: node dist/main.js` (для Heroku/buildpack-платформ) |
| `package.json` | скрипты `test`, `test:e2e`, `engines.node`, конфиг jest |
| `src/app.controller.spec.ts` | юнит-тесты контроллера (`/health`, `/`) |
| `src/tasks/tasks.service.spec.ts` | юнит-тесты RBAC-логики задач |
| `test/auth.e2e-spec.ts` | e2e: `/health`, логин, неверный пароль, защита `/tasks` |
| `Dockerfile` | оптимизированный multistage-образ из ЛР №18 |
| `.github/workflows/deploy.yml` | CI/CD: тесты → образ → Docker Hub → Render |

## Локальная проверка (как в CI)

```powershell
npm ci
npm test -- --ci          # юнит-тесты
npm run test:e2e -- --ci  # e2e-тесты
npm run build
docker build -t lab19-nest-app:local .
docker run --rm -p 3100:3000 -e PORT=3000 lab19-nest-app:local
```

## Настройка CI/CD

1. Создайте репозиторий на GitHub и запушьте проект в ветку `main`.
2. **Settings → Secrets and variables → Actions** добавьте:

   | Секрет | Откуда взять |
   | --- | --- |
   | `DOCKERHUB_USERNAME` | логин Docker Hub |
   | `DOCKERHUB_TOKEN` | Docker Hub → Account Settings → Personal access tokens |
   | `RENDER_DEPLOY_HOOK_URL` | Render → ваш сервис → Settings → Deploy Hook |

3. Docker Hub: заранее создайте репозиторий `lab19-nest-app` (или разрешите
   автоматическое создание — оно включено по умолчанию для токена с правами
   Read & Write).
4. Render: **New → Web Service → Deploy an existing image**, образ
   `<dockerhub-username>/lab19-nest-app:latest`. В Environment добавьте
   `JWT_SECRET`, `ADMIN_PASSWORD`, `DEMO_PASSWORD` (значения — свои, не из `.env`).
   Deploy Hook из настроек сервиса скопируйте в секрет GitHub.
5. Сделайте коммит и пуш в `main` → вкладка **Actions** покажет job-ы
   `Tests & build` → `Build & push image` → `Deploy to Render`.

## Проверка, что пайплайн останавливается на ошибке

Сломайте любой тест (например, ожидание `status: 'fail'`), запушьте — job
`Tests & build` упадёт, а `Build & push image` и `Deploy to Render` не
запустятся (`needs: test`). Скриншот такого прогона — хорошее доказательство
для отчёта. После проверки верните тест обратно.

## Railway вместо Render

В конце `deploy.yml` есть закомментированный job для Railway: удалите job
`deploy` (Render), раскомментируйте Railway-вариант, добавьте секрет
`RAILWAY_TOKEN` и создайте сервис из образа Docker Hub.

## Важно про SQLite в облаке

Файл SQLite живёт внутри контейнера и исчезает при перезапуске/пересборке.
Для лабораторной этого достаточно, но на защите стоит сказать: в реальном
проекте подключают управляемую PostgreSQL (Render/Railway дают её бесплатно),
а строку подключения передают через переменную окружения.
