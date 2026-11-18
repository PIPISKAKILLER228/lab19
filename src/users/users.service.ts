import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!includePassword) {
      return this.usersRepository.findOne({
        where: { email: normalizedEmail },
      });
    }

    // passwordHash помечен select: false, поэтому для проверки пароля
    // его нужно явно добавить в выборку.
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.email = :email', { email: normalizedEmail })
      .getOne();
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
    roles: Role[];
  }): Promise<User> {
    const user = this.usersRepository.create({
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      passwordHash: data.passwordHash,
      roles: data.roles,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { id: 'ASC' } });
  }

  toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: (user.roles ?? []).map((role) => role.name),
    };
  }
}
