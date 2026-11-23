import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

/** R1 absensi siswa: sesi, catatan, koreksi, rekap, kehadiran pribadi. */
@Module({
  imports: [AcademicsModule, CommunicationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
