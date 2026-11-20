import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SESSION_COOKIE, type Permission, type RoleKey } from '@smart-school/contracts';
import type { Env } from '../config/env.js';
import { readCookie } from '../common/request-meta.js';
import { IS_PUBLIC, REQUIRED_PERMISSIONS, REQUIRED_ROLES } from './decorators.js';
import { SessionService } from './session.service.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guard global: setiap endpoint wajib login kecuali ditandai @Public().
 * Izin diperiksa di sini (deny by default); scope data diperiksa lagi di service.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    config: ConfigService<Env, true>,
  ) {
    this.allowedOrigins = new Set(
      config
        .get('WEB_ORIGIN', { infer: true })
        .split(',')
        .map((o) => o.trim()),
    );
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const targets = [ctx.getHandler(), ctx.getClass()];

    // Lapisan CSRF tambahan di atas SameSite=Lax: mutasi dari origin asing ditolak.
    const origin = req.header('origin');
    if (!SAFE_METHODS.has(req.method) && origin && !this.allowedOrigins.has(origin)) {
      throw new ForbiddenException('Origin permintaan tidak diizinkan.');
    }

    const token = readCookie(req, SESSION_COOKIE);
    if (token) req.auth = (await this.sessions.resolve(token)) ?? undefined;

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (!req.auth) throw new UnauthorizedException('Sesi tidak ditemukan atau sudah berakhir. Silakan masuk kembali.');

    const roles = this.reflector.getAllAndOverride<RoleKey[] | undefined>(REQUIRED_ROLES, targets);
    if (roles && !roles.includes(req.auth.activeRole)) {
      throw new ForbiddenException('Peran aktif Anda tidak dapat mengakses halaman ini.');
    }
    const permissions = this.reflector.getAllAndOverride<Permission[] | undefined>(REQUIRED_PERMISSIONS, targets);
    if (permissions && !permissions.every((p) => req.auth!.permissions.has(p))) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk tindakan ini.');
    }
    return true;
  }
}
