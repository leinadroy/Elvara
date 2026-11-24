import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';
import { ClassesService } from './classes.service.js';
import { CurriculumService } from './curriculum.service.js';
import { MetricsService } from './metrics.service.js';
import { ScopeService } from './scope.service.js';
import { TimetableService } from './timetable.service.js';

/** R1 akademik: tingkat, program, rombel, wali kelas, penempatan, mapel, penugasan, jadwal. */
@Module({
  controllers: [AcademicsController, CalendarController],
  providers: [ClassesService, CurriculumService, TimetableService, ScopeService, MetricsService, CalendarService],
  exports: [ClassesService, TimetableService, ScopeService, MetricsService],
})
export class AcademicsModule {}
