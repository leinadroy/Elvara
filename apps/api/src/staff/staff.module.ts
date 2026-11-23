import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module.js';
import { StaffController } from './staff.controller.js';
import { WorkShiftsService } from './work-shifts.service.js';

/** Pekerjaan pegawai. R1: jadwal tugas staf (work_shift, ADR 0004); R3 menambah pola jadwal, kehadiran, izin, cuti. */
@Module({
  imports: [AcademicsModule],
  controllers: [StaffController],
  providers: [WorkShiftsService],
  exports: [WorkShiftsService],
})
export class StaffModule {}
