import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Требуется валидный JWT-токен в заголовке Authorization: Bearer <token>',
        )
      );
    }

    return user as TUser;
  }
}
