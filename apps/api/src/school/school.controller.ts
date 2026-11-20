import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  CreateAcademicYearSchema,
  CreateBuildingSchema,
  CreateFloorSchema,
  CreateRoomSchema,
  UpdateRoomSchema,
  UpdateSchoolSchema,
  UuidParamSchema,
} from '@smart-school/contracts';
import type { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { requestMeta } from '../common/request-meta.js';
import { AcademicYearsService } from './academic-years.service.js';
import { SchoolService } from './school.service.js';

@Controller()
export class SchoolController {
  constructor(private readonly school: SchoolService) {}

  @Get('school')
  get(@CurrentAuth() auth: AuthContext) {
    return this.school.get(auth);
  }

  @Patch('school')
  @RequirePermissions('school:manage')
  update(@CurrentAuth() auth: AuthContext, @Body({ schema: UpdateSchoolSchema }) body: z.infer<typeof UpdateSchoolSchema>, @Req() req: Request) {
    return this.school.update(auth, body, requestMeta(req));
  }

  @Get('buildings')
  @RequirePermissions('school:read')
  buildings(@CurrentAuth() auth: AuthContext) {
    return this.school.buildings(auth);
  }

  @Post('buildings')
  @RequirePermissions('school:manage')
  createBuilding(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateBuildingSchema }) body: z.infer<typeof CreateBuildingSchema>, @Req() req: Request) {
    return this.school.createBuilding(auth, body, requestMeta(req));
  }

  @Post('buildings/:id/floors')
  @RequirePermissions('school:manage')
  createFloor(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Body({ schema: CreateFloorSchema }) body: z.infer<typeof CreateFloorSchema>,
    @Req() req: Request,
  ) {
    return this.school.createFloor(auth, id, body, requestMeta(req));
  }

  @Post('rooms')
  @RequirePermissions('school:manage')
  createRoom(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateRoomSchema }) body: z.infer<typeof CreateRoomSchema>, @Req() req: Request) {
    return this.school.createRoom(auth, body, requestMeta(req));
  }

  @Patch('rooms/:id')
  @HttpCode(204)
  @RequirePermissions('school:manage')
  updateRoom(
    @CurrentAuth() auth: AuthContext,
    @Param('id', { schema: UuidParamSchema }) id: string,
    @Body({ schema: UpdateRoomSchema }) body: z.infer<typeof UpdateRoomSchema>,
    @Req() req: Request,
  ) {
    return this.school.updateRoom(auth, id, body, requestMeta(req));
  }
}

@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly years: AcademicYearsService) {}

  @Get()
  @RequirePermissions('academic-years:read')
  list(@CurrentAuth() auth: AuthContext) {
    return this.years.list(auth);
  }

  /** Konteks tahun ajaran aktif dibutuhkan semua peran, termasuk siswa dan wali. */
  @Get('current')
  current(@CurrentAuth() auth: AuthContext) {
    return this.years.current(auth);
  }

  @Post()
  @RequirePermissions('academic-years:manage')
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: CreateAcademicYearSchema }) body: z.infer<typeof CreateAcademicYearSchema>, @Req() req: Request) {
    return this.years.create(auth, body, requestMeta(req));
  }

  @Post(':id/activate')
  @HttpCode(200)
  @RequirePermissions('academic-years:manage')
  activate(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.years.activate(auth, id, requestMeta(req));
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions('academic-years:manage')
  close(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.years.close(auth, id, requestMeta(req));
  }
}
