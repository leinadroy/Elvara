import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  LoginSchema,
  MfaCodeSchema,
  MfaVerifyLoginSchema,
  PasswordSchema,
  SESSION_COOKIE,
  SwitchRoleSchema,
  type LoginInput,
  type LoginResponse,
  type Me,
} from '@smart-school/contracts';
import type { Env } from '../config/env.js';
import { requestMeta } from '../common/request-meta.js';
import { AuthService, type LoginResult } from './auth.service.js';
import type { AuthContext } from './auth.types.js';
import { CurrentAuth, Public } from './decorators.js';

const ChangePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: PasswordSchema });
const loginLimit = () => Number(process.env.LOGIN_RATE_LIMIT ?? 10);

@Controller('auth')
export class AuthController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  private respond(result: LoginResult, res: Response): LoginResponse {
    if (result.kind === 'mfa') return { mfaRequired: true, challenge: result.challenge };
    res.cookie(SESSION_COOKIE, result.token, { httpOnly: true, secure: this.secureCookie, sameSite: 'lax', path: '/', expires: result.expiresAt });
    return { mfaRequired: false, ...result.me };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: loginLimit, ttl: 60_000 } })
  async login(@Body({ schema: LoginSchema }) body: LoginInput, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<LoginResponse> {
    return this.respond(await this.auth.login(body, requestMeta(req)), res);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: loginLimit, ttl: 60_000 } })
  async verifyMfa(
    @Body({ schema: MfaVerifyLoginSchema }) body: z.infer<typeof MfaVerifyLoginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.respond(await this.auth.verifyMfaLogin(body.challenge, body.code, requestMeta(req)), res);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentAuth() auth: AuthContext, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(auth, requestMeta(req));
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  me(@CurrentAuth() auth: AuthContext): Promise<Me> {
    return this.auth.me(auth);
  }

  @Post('active-role')
  @HttpCode(204)
  async switchRole(@CurrentAuth() auth: AuthContext, @Body({ schema: SwitchRoleSchema }) body: z.infer<typeof SwitchRoleSchema>, @Req() req: Request): Promise<void> {
    await this.auth.switchRole(auth, body.role, requestMeta(req));
  }

  @Post('password')
  @HttpCode(204)
  @Throttle({ default: { limit: loginLimit, ttl: 60_000 } })
  changePassword(@CurrentAuth() auth: AuthContext, @Body({ schema: ChangePasswordSchema }) body: z.infer<typeof ChangePasswordSchema>, @Req() req: Request) {
    return this.auth.changePassword(auth, body.currentPassword, body.newPassword, requestMeta(req));
  }

  @Get('mfa')
  mfaStatus(@CurrentAuth() auth: AuthContext) {
    return this.auth.mfaStatus(auth);
  }

  @Post('mfa/setup')
  @HttpCode(200)
  mfaSetup(@CurrentAuth() auth: AuthContext) {
    return this.auth.mfaSetup(auth);
  }

  @Post('mfa/enable')
  @HttpCode(204)
  @Throttle({ default: { limit: loginLimit, ttl: 60_000 } })
  mfaEnable(@CurrentAuth() auth: AuthContext, @Body({ schema: MfaCodeSchema }) body: z.infer<typeof MfaCodeSchema>, @Req() req: Request) {
    return this.auth.mfaEnable(auth, body.code, requestMeta(req));
  }

  @Post('mfa/disable')
  @HttpCode(204)
  @Throttle({ default: { limit: loginLimit, ttl: 60_000 } })
  mfaDisable(@CurrentAuth() auth: AuthContext, @Body({ schema: MfaCodeSchema }) body: z.infer<typeof MfaCodeSchema>, @Req() req: Request) {
    return this.auth.mfaDisable(auth, body.code, requestMeta(req));
  }
}
