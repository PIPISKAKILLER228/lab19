import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';

type MockRepository = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

const createRepository = (): MockRepository => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: Partial<Task>) => dto),
  save: jest.fn((task: Partial<Task>) => Promise.resolve(task)),
  remove: jest.fn(),
});

const administrator: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  name: 'Администратор',
  roles: ['administrator', 'user'],
};

const regularUser: AuthUser = {
  id: 2,
  email: 'user@example.com',
  name: 'Пользователь',
  roles: ['user'],
};

describe('TasksService', () => {
  let service: TasksService;
  let repository: MockRepository;

  beforeEach(() => {
    repository = createRepository();
    service = new TasksService(repository as unknown as Repository<Task>);
  });

  it('администратор получает все задачи (пустой фильтр)', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll(administrator);

    expect(repository.find).toHaveBeenCalledWith({
      where: {},
      order: { createdAt: 'DESC' },
    });
  });

  it('обычный пользователь получает только свои задачи', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll(regularUser);

    expect(repository.find).toHaveBeenCalledWith({
      where: { ownerId: regularUser.id },
      order: { createdAt: 'DESC' },
    });
  });

  it('create подставляет владельца и обрезает пробелы', async () => {
    const task = await service.create(
      { title: '  Купить хлеб  ', description: '  вечером  ' },
      regularUser,
    );

    expect(task).toMatchObject({
      title: 'Купить хлеб',
      description: 'вечером',
      isCompleted: false,
      ownerId: regularUser.id,
    });
  });

  it('findOne бросает NotFoundException, если задача не найдена', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99, regularUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
