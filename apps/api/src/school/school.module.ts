import { Module } from '@nestjs/common';
import { AcademicYearsController, SchoolController } from './school.controller.js';
import { AcademicYearsService } from './academic-years.service.js';
import { SchoolService } from './school.service.js';

@Module({
  controllers: [SchoolController, AcademicYearsController],
  providers: [SchoolService, AcademicYearsService],
})
export class SchoolModule {}
