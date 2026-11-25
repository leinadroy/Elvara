import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module.js';
import { GradebookService } from './gradebook.service.js';
import { GradingController } from './grading.controller.js';
import { SchemesService } from './schemes.service.js';

/** R2 penilaian: skema nilai dan capaian pembelajaran (berikutnya: penilaian, buku nilai, rapor). */
@Module({
  imports: [AcademicsModule],
  controllers: [GradingController],
  providers: [SchemesService, GradebookService],
  exports: [SchemesService, GradebookService],
})
export class GradingModule {}
