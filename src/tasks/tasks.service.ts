import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  private isAdministrator(user: AuthUser): boolean {
    return user.roles.includes('administrator');
  }

  async findAll(user: AuthUser): Promise<Task[]> {
    const where = this.isAdministrator(user) ? {} : { ownerId: user.id };

    return this.tasksRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: AuthUser): Promise<Task> {
    const where = this.isAdministrator(user)
      ? { id }
      : { id, ownerId: user.id };

    const task = await this.tasksRepository.findOne({ where });

    if (!task) {
      throw new NotFoundException(`Задача с id=${id} не найдена`);
    }

    return task;
  }

  async create(dto: CreateTaskDto, user: AuthUser): Promise<Task> {
    const task = this.tasksRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      isCompleted: dto.isCompleted ?? false,
      ownerId: user.id,
    });

    return this.tasksRepository.save(task);
  }

  async update(
    id: number,
    dto: UpdateTaskDto,
    user: AuthUser,
  ): Promise<Task> {
    const task = await this.findOne(id, user);

    if (dto.title !== undefined) {
      task.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      task.description = dto.description.trim();
    }
    if (dto.isCompleted !== undefined) {
      task.isCompleted = dto.isCompleted;
    }

    return this.tasksRepository.save(task);
  }

  async remove(id: number) {
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Задача с id=${id} не найдена`);
    }

    await this.tasksRepository.remove(task);

    return {
      message: 'Задача удалена',
      id,
    };
  }
}
