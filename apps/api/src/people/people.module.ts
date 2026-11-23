import { Module } from '@nestjs/common';
import {
  EmployeesController,
  GuardianPortalController,
  GuardiansController,
  MeController,
  StudentGuardiansController,
  StudentsController,
} from './people.controller.js';
import { EmployeesService } from './employees.service.js';
import { GuardiansService } from './guardians.service.js';
import { StudentsService } from './students.service.js';
import { SearchController } from './search.controller.js';
import { DashboardController } from './dashboard.controller.js';
import { AcademicsModule } from '../academics/academics.module.js';

@Module({
  imports: [AcademicsModule],
  controllers: [StudentsController, StudentGuardiansController, EmployeesController, GuardiansController, GuardianPortalController, MeController, SearchController, DashboardController],
  providers: [StudentsService, EmployeesService, GuardiansService],
  exports: [StudentsService],
})
export class PeopleModule {}
