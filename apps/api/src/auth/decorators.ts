import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Permission, RoleKey } from '@smart-school/contracts';
import type { AuthContext } from './auth.types.js';

export const IS_PUBLIC = 'auth:public';
export const REQUIRED_PERMISSIONS = 'auth:permissions';
export const REQUIRED_ROLES = 'auth:roles';

/** Endpoint dapat diakses tanpa sesi. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Semua izin wajib dimiliki oleh peran aktif. */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);

/** Peran aktif harus salah satu dari daftar ini (untuk endpoint berbasis scope seperti /guardian). */
export const RequireActiveRole = (...roles: RoleKey[]) => SetMetadata(REQUIRED_ROLES, roles);

/** Konteks pengguna yang sudah diautentikasi. */
export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const auth = ctx.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw new UnauthorizedException();
  return auth;
});
