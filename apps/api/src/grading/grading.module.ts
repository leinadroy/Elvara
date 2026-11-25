import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ActivitiesController } from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';
import { GradebookService } from './gradebook.service.js';
import { GradingController } from './grading.controller.js';
import { PortalGradesService } from './portal-grades.service.js';
import { SchemesService } from './schemes.service.js';

/** R2 penilaian: skema nilai, capaian pembelajaran, penilaian dan buku nilai, tugas dan pengumpulan (berikutnya: rapor). */
@Module({
  imports: [AcademicsModule, DocumentsModule, CommunicationsModule],
  controllers: [GradingController, ActivitiesController],
  providers: [SchemesService, GradebookService, ActivitiesService, PortalGradesService],
  exports: [SchemesService, GradebookService],
})
export class GradingModule {}
