import { Module } from '@nestjs/common';
import { GradingController } from './grading.controller.js';
import { SchemesService } from './schemes.service.js';
import { AssessmentsController } from './assessments.controller.js';
import { AssessmentsService } from './assessments.service.js';
import { AcademicsModule } from '../academics/academics.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { PortalGradesController } from './portal-grades.controller.js';
import { PortalGradesService } from './portal-grades.service.js';
import { ActivitiesController } from './activities.controller.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ReportCardsController } from './report-cards.controller.js';

/** R2 penilaian: skema nilai, capaian, dan penilaian draf (berikutnya: buku nilai dan rapor). */
@Module({
  imports: [AcademicsModule, CommunicationsModule, DocumentsModule],
  controllers: [GradingController, AssessmentsController, PortalGradesController, ActivitiesController, ReportCardsController],
  providers: [SchemesService, AssessmentsService, PortalGradesService],
  exports: [SchemesService],
})
export class GradingModule {}
