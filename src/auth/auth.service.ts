import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Проверка пары email/пароль для Passport LocalStrategy.
   * Возвращает безопасное представление пользователя или null.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    if (!email || !password) {
      return null;
    }

    const user = await this.usersService.findByEmail(email, true);
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    return this.usersService.toAuthUser(user);
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким email уже зарегистрирован',
      );
    }

    const defaultRole = await this.usersService.findRoleByName('user');
    if (!defaultRole) {
      throw new InternalServerErrorException(
        'Роль "user" не найдена. Перезапустите приложение для инициализации ролей.',
      );
    }

    // Пароль никогда не сохраняется в открытом виде: только bcrypt-хеш с солью.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      roles: [defaultRole],
    });

    return {
      message: 'Пользователь успешно зарегистрирован',
      user: this.usersService.toAuthUser(user),
    };
  }

  async login(user: AuthUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const expiresInSeconds = Number(
      this.configService.get<string>('JWT_EXPIRES_IN_SECONDS') ?? 3600,
    );

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      user,
    };
  }
}
