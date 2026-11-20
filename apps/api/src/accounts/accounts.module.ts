import { Global, Module } from '@nestjs/common';
import { AccountsController, InvitationsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { InvitationsService } from './invitations.service.js';

@Global()
@Module({
  controllers: [AccountsController, InvitationsController],
  providers: [AccountsService, InvitationsService],
  exports: [InvitationsService],
})
export class AccountsModule {}
