import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'Лабораторная работа №17. Аутентификация и авторизация в NestJS',
      docs: 'Пошаговая проверка описана в файле ПРОВЕРКА.md',
      endpoints: {
        health: 'GET /health',
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        profile: 'GET /auth/profile (JWT)',
        tasks: 'GET /tasks (JWT)',
        createTask: 'POST /tasks (JWT)',
        updateTask: 'PATCH /tasks/:id (JWT, владелец или administrator)',
        deleteTask: 'DELETE /tasks/:id (JWT + administrator)',
      },
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
