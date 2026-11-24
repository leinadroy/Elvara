import { Module } from '@nestjs/common';
import { GradingController } from './grading.controller.js';
import { SchemesService } from './schemes.service.js';

/** R2 penilaian: skema nilai dan capaian pembelajaran (berikutnya: penilaian, buku nilai, rapor). */
@Module({
  controllers: [GradingController],
  providers: [SchemesService],
  exports: [SchemesService],
})
export class GradingModule {}
