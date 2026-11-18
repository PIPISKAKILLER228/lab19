import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Кастомный декоратор поверх SetMetadata.
 * Пример: @Roles('administrator')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
