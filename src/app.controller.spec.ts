import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('GET /health возвращает status: ok', () => {
    const result = controller.health();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
  });

  it('GET / перечисляет основные эндпоинты', () => {
    const result = controller.root();

    expect(result.endpoints.health).toBe('GET /health');
    expect(result.endpoints.login).toBe('POST /auth/login');
  });
});
