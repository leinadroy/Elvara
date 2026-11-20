import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  AcceptInvitationSchema,
  CreateAccountInvitationSchema,
  SESSION_COOKIE,
  UpdateAccountRolesSchema,
  UuidParamSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import type { Env } from '../config/env.js';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, Public, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { AccountsService } from './accounts.service.js';
import { InvitationsService } from './invitations.service.js';

@Controller()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('accounts')
  @RequirePermissions('accounts:manage')
  list(@CurrentAuth() auth: AuthContext) {
    return this.accounts.list(auth);
  }

  @Post('people/:personId/invitations')
  @RequirePermissions('accounts:manage')
  invite(
    @CurrentAuth() auth: AuthContext,
    @Param('personId', { schema: UuidParamSchema }) personId: string,
    @Body({ schema: CreateAccountInvitationSchema }) body: z.infer<typeof CreateAccountInvitationSchema>,
    @Req() req: Request,
  ) {
    return this.accounts.invite(auth, personId, body.role, requestMeta(req));
  }

  @Post('accounts/:id/disable')
  @HttpCode(204)
  @RequirePermissions('accounts:manage')
  disable(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.accounts.setStatus(auth, id, 'DISABLED', requestMeta(req));
  }

  @Post('accounts/:id/enable')
  @HttpCode(204)
  @RequirePermissions('accounts:manage')
  enable(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.accounts.setStatus(auth, id, 'ACTIVE', requestMeta(req));
  }

  @Post('accounts/:id/mfa/reset')
  @HttpCode(204)
  @RequirePermissions('accounts:manage')
  resetMfa(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.accounts.resetMfa(auth, id, requestMeta(req));
  }

  @Put('accounts/:id/roles')
  @HttpCode(204)
  @RequirePermissions('accounts:manage')
  setRoles(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Body({ schema: UpdateAccountRolesSchema }) body: z.infer<typeof UpdateAccountRolesSchema>,
    @Req() req: Request,
  ) {
    return this.accounts.setRoles(auth, id, body.roles, requestMeta(req));
  }
}

/** Endpoint publik untuk penerima undangan. */
@Controller('invitations')
export class InvitationsController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly invitations: InvitationsService,
    private readonly accounts: AccountsService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Public()
  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Public()
  @Post(':token/accept')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async accept(
    @Param('token') token: string,
    @Body({ schema: AcceptInvitationSchema }) body: z.infer<typeof AcceptInvitationSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = requestMeta(req);
    const result = await this.invitations.accept(token, body.password, req.auth, meta);
    if (result.createdAccount) {
      const session = await this.accounts.createSession(result.userId, result.role, meta);
      res.cookie(SESSION_COOKIE, session.token, {
        httpOnly: true,
        secure: this.secureCookie,
        sameSite: 'lax',
        path: '/',
        expires: session.expiresAt,
      });
    }
    return { createdAccount: result.createdAccount, role: result.role };
  }
}
