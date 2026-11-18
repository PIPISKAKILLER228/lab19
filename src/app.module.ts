import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const rawPath =
          configService.get<string>('DB_PATH') ?? './data/lab19.sqlite';
        // ':memory:' используется в e2e-тестах — resolve() к нему неприменим
        const database = rawPath === ':memory:' ? rawPath : resolve(rawPath);

        if (database !== ':memory:') {
          const databaseDir = dirname(database);

          if (!existsSync(databaseDir)) {
            mkdirSync(databaseDir, { recursive: true });
          }
        }

        return {
          type: 'better-sqlite3' as const,
          database,
          autoLoadEntities: true,
          // Для лабораторной схемы создаётся автоматически.
          // В production используйте миграции и synchronize: false.
          synchronize: true,
          logging: false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    TasksModule,
    SeedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
