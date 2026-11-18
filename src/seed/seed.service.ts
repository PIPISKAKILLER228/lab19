import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

const BCRYPT_ROUNDS = 10;
const ROLE_NAMES = ['administrator', 'user'] as const;

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const roles = new Map<string, Role>();

    for (const roleName of ROLE_NAMES) {
      let role = await this.rolesRepository.findOne({
        where: { name: roleName },
      });

      if (!role) {
        role = await this.rolesRepository.save(
          this.rolesRepository.create({ name: roleName }),
        );
      }

      roles.set(roleName, role);
    }

    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@example.com';
    const adminPassword =
      this.configService.get<string>('ADMIN_PASSWORD') ?? 'Admin123!';
    const demoEmail =
      this.configService.get<string>('DEMO_EMAIL') ?? 'user@example.com';
    const demoPassword =
      this.configService.get<string>('DEMO_PASSWORD') ?? 'User123!';

    await this.ensureUser({
      email: adminEmail,
      name: 'Администратор',
      password: adminPassword,
      roleNames: ['administrator', 'user'],
      roles,
    });

    await this.ensureUser({
      email: demoEmail,
      name: 'Демо-пользователь',
      password: demoPassword,
      roleNames: ['user'],
      roles,
    });

    this.logger.log(`Роли инициализированы: ${ROLE_NAMES.join(', ')}`);
    this.logger.log(
      `Демо-аккаунты: ${adminEmail} (administrator) и ${demoEmail} (user). Пароли задаются в .env`,
    );
  }

  private async ensureUser(params: {
    email: string;
    name: string;
    password: string;
    roleNames: string[];
    roles: Map<string, Role>;
  }): Promise<void> {
    const email = params.email.trim().toLowerCase();
    const desiredRoles = params.roleNames.map((roleName) => {
      const role = params.roles.get(roleName);
      if (!role) {
        throw new Error(`Роль "${roleName}" не была создана`);
      }
      return role;
    });

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(
        params.password,
        BCRYPT_ROUNDS,
      );

      const user = this.usersRepository.create({
        email,
        name: params.name,
        passwordHash,
        roles: desiredRoles,
      });

      await this.usersRepository.save(user);
      this.logger.log(
        `Создан пользователь ${email} с ролями: ${params.roleNames.join(', ')}`,
      );
      return;
    }

    const currentRoles = new Set(
      existingUser.roles.map((role) => role.name),
    );
    const missingRoles = desiredRoles.filter(
      (role) => !currentRoles.has(role.name),
    );

    if (missingRoles.length > 0) {
      existingUser.roles = [...existingUser.roles, ...missingRoles];
      await this.usersRepository.save(existingUser);
      this.logger.log(
        `Пользователю ${email} добавлены роли: ${missingRoles
          .map((role) => role.name)
          .join(', ')}`,
      );
    }
  }
}
