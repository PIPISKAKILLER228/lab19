import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Достаёт пользователя, которого Passport положил в request.user.
 * Работает и с LocalStrategy (логин), и с JwtStrategy (защищённые маршруты).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
