import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module.js';
import { AnnouncementsService } from './announcements.service.js';
import { CommunicationsController } from './communications.controller.js';
import { NotificationsService } from './notifications.service.js';

/** R1 komunikasi (D8: dalam aplikasi dulu): pengumuman, notifikasi, tanda baca. */
@Module({
  imports: [AcademicsModule],
  controllers: [CommunicationsController],
  providers: [AnnouncementsService, NotificationsService],
  exports: [NotificationsService],
})
export class CommunicationsModule {}
