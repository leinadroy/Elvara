import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  AssignHomeroomSchema,
  ClassGroupListQuerySchema,
  ClassGroupSchema,
  EndEnrollmentSchema,
  EnrollStudentsSchema,
  GradeLevelSchema,
  isoDate,
  LessonPeriodsSchema,
  MoveEnrollmentSchema,
  ProgramSchema,
  PublishTimetableSchema,
  ScheduleExceptionQuerySchema,
  ScheduleExceptionSchema,
  TimetableLensQuerySchema,
  SubjectSchema,
  TeachingAssignmentSchema,
  TimetableSlotSchema,
  UpdateClassGroupSchema,
  UuidParamSchema,
} from '@smart-school/contracts';
import { z } from 'zod';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth, RequirePermissions } from '../auth/decorators.js';
import { fromDbDate } from '../common/dates.js';
import { requestMeta } from '../common/request-meta.js';
import { addDays } from '../common/school-time.js';
import { ClassesService } from './classes.service.js';
import { CurriculumService } from './curriculum.service.js';
import { ScopeService } from './scope.service.js';
import { TimetableService } from './timetable.service.js';

const CandidatesQuery = z.object({ date: isoDate, q: z.string().trim().max(100).optional() });
const AssignmentQuery = z.object({ termId: z.uuid().optional(), classGroupId: z.uuid().optional(), employeeId: z.uuid().optional() });
const UpdateAssignmentSchema = z.object({ employeeId: z.uuid().optional(), weeklyPeriods: z.coerce.number().int().min(0).max(40).optional() });
const TermClassSchema = z.object({ termId: z.uuid({ error: 'Pilih semester.' }), classGroupId: z.uuid({ error: 'Pilih rombel.' }) });
const PortalQuery = z.object({ studentId: z.uuid().optional() });

@ApiTags('Akademik')
@Controller()
export class AcademicsController {
  constructor(
    private readonly classes: ClassesService,
    private readonly curriculum: CurriculumService,
    private readonly timetable: TimetableService,
    private readonly scope: ScopeService,
  ) {}

  @Get('academics/options')
  @RequirePermissions('classes:read')
  options(@CurrentAuth() auth: AuthContext) {
    return this.classes.options(auth);
  }

  // ───────────── Tingkat & program ─────────────

  @Get('grade-levels')
  @RequirePermissions('classes:read')
  gradeLevels(@CurrentAuth() auth: AuthContext) {
    return this.classes.gradeLevels(auth);
  }

  @Post('grade-levels')
  @RequirePermissions('classes:manage')
  createGradeLevel(@CurrentAuth() auth: AuthContext, @Body({ schema: GradeLevelSchema }) body: z.infer<typeof GradeLevelSchema>, @Req() req: Request) {
    return this.classes.saveGradeLevel(auth, null, body, requestMeta(req));
  }

  @Put('grade-levels/:id')
  @RequirePermissions('classes:manage')
  updateGradeLevel(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: GradeLevelSchema }) body: z.infer<typeof GradeLevelSchema>, @Req() req: Request) {
    return this.classes.saveGradeLevel(auth, id, body, requestMeta(req));
  }

  @Get('programs')
  @RequirePermissions('classes:read')
  programs(@CurrentAuth() auth: AuthContext) {
    return this.classes.programs(auth);
  }

  @Post('programs')
  @RequirePermissions('classes:manage')
  createProgram(@CurrentAuth() auth: AuthContext, @Body({ schema: ProgramSchema }) body: z.infer<typeof ProgramSchema>, @Req() req: Request) {
    return this.classes.saveProgram(auth, null, body, requestMeta(req));
  }

  @Put('programs/:id')
  @RequirePermissions('classes:manage')
  updateProgram(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ProgramSchema }) body: z.infer<typeof ProgramSchema>, @Req() req: Request) {
    return this.classes.saveProgram(auth, id, body, requestMeta(req));
  }

  // ───────────── Rombel, wali kelas, penempatan ─────────────

  @Get('class-groups')
  @RequirePermissions('classes:read')
  listClasses(@CurrentAuth() auth: AuthContext, @Query({ schema: ClassGroupListQuerySchema }) q: z.infer<typeof ClassGroupListQuerySchema>) {
    return this.classes.list(auth, q.academicYearId);
  }

  @Post('class-groups')
  @RequirePermissions('classes:manage')
  createClass(@CurrentAuth() auth: AuthContext, @Body({ schema: ClassGroupSchema }) body: z.infer<typeof ClassGroupSchema>, @Req() req: Request) {
    return this.classes.create(auth, body, requestMeta(req));
  }

  @Get('class-groups/:id')
  @RequirePermissions('classes:read')
  getClass(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string) {
    return this.classes.get(auth, id);
  }

  @Patch('class-groups/:id')
  @HttpCode(204)
  @RequirePermissions('classes:manage')
  updateClass(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: UpdateClassGroupSchema }) body: z.infer<typeof UpdateClassGroupSchema>, @Req() req: Request) {
    return this.classes.update(auth, id, body, requestMeta(req));
  }

  @Post('class-groups/:id/homeroom')
  @HttpCode(204)
  @RequirePermissions('classes:manage')
  assignHomeroom(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: AssignHomeroomSchema }) body: z.infer<typeof AssignHomeroomSchema>, @Req() req: Request) {
    return this.classes.assignHomeroom(auth, id, body, requestMeta(req));
  }

  @Get('class-groups/:id/candidates')
  @RequirePermissions('classes:manage')
  candidates(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Query({ schema: CandidatesQuery }) q: z.infer<typeof CandidatesQuery>) {
    return this.classes.candidates(auth, id, q.date, q.q);
  }

  @Post('class-groups/:id/enrollments')
  @HttpCode(200)
  @RequirePermissions('classes:manage')
  enroll(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: EnrollStudentsSchema }) body: z.infer<typeof EnrollStudentsSchema>, @Req() req: Request) {
    return this.classes.enroll(auth, id, body.studentIds, body.validFrom, requestMeta(req));
  }

  @Post('enrollments/:id/move')
  @HttpCode(204)
  @RequirePermissions('classes:manage')
  move(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: MoveEnrollmentSchema }) body: z.infer<typeof MoveEnrollmentSchema>, @Req() req: Request) {
    return this.classes.move(auth, id, body.toClassGroupId, body.date, body.reason, requestMeta(req));
  }

  @Post('enrollments/:id/end')
  @HttpCode(204)
  @RequirePermissions('classes:manage')
  end(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: EndEnrollmentSchema }) body: z.infer<typeof EndEnrollmentSchema>, @Req() req: Request) {
    return this.classes.end(auth, id, body.validTo, body.reason, requestMeta(req));
  }

  // ───────────── Mapel, penugasan, jam pelajaran ─────────────

  @Get('subjects')
  @RequirePermissions('classes:read')
  subjects(@CurrentAuth() auth: AuthContext) {
    return this.curriculum.subjects(auth);
  }

  @Post('subjects')
  @RequirePermissions('curriculum:manage')
  createSubject(@CurrentAuth() auth: AuthContext, @Body({ schema: SubjectSchema }) body: z.infer<typeof SubjectSchema>, @Req() req: Request) {
    return this.curriculum.saveSubject(auth, null, body, requestMeta(req));
  }

  @Put('subjects/:id')
  @RequirePermissions('curriculum:manage')
  updateSubject(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: SubjectSchema }) body: z.infer<typeof SubjectSchema>, @Req() req: Request) {
    return this.curriculum.saveSubject(auth, id, body, requestMeta(req));
  }

  @Get('teaching-assignments')
  @RequirePermissions('classes:read')
  assignments(@CurrentAuth() auth: AuthContext, @Query({ schema: AssignmentQuery }) q: z.infer<typeof AssignmentQuery>) {
    return this.curriculum.assignments(auth, q);
  }

  @Post('teaching-assignments')
  @RequirePermissions('curriculum:manage')
  createAssignment(@CurrentAuth() auth: AuthContext, @Body({ schema: TeachingAssignmentSchema }) body: z.infer<typeof TeachingAssignmentSchema>, @Req() req: Request) {
    return this.curriculum.createAssignment(auth, body, requestMeta(req));
  }

  @Patch('teaching-assignments/:id')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  updateAssignment(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: UpdateAssignmentSchema }) body: z.infer<typeof UpdateAssignmentSchema>, @Req() req: Request) {
    return this.curriculum.updateAssignment(auth, id, body, requestMeta(req));
  }

  @Delete('teaching-assignments/:id')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  deleteAssignment(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.curriculum.deleteAssignment(auth, id, requestMeta(req));
  }

  @Get('lesson-periods')
  @RequirePermissions('timetable:read')
  periods(@CurrentAuth() auth: AuthContext) {
    return this.curriculum.periods(auth);
  }

  @Put('lesson-periods')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  savePeriods(@CurrentAuth() auth: AuthContext, @Body({ schema: LessonPeriodsSchema }) body: z.infer<typeof LessonPeriodsSchema>, @Req() req: Request) {
    return this.curriculum.savePeriods(auth, body, requestMeta(req));
  }

  // ───────────── Penyusunan jadwal ─────────────

  @Get('timetable')
  @RequirePermissions('classes:read')
  getTimetable(@CurrentAuth() auth: AuthContext, @Query({ schema: TermClassSchema }) q: z.infer<typeof TermClassSchema>) {
    return this.timetable.get(auth, q.termId, q.classGroupId);
  }

  @Post('timetable/drafts')
  @RequirePermissions('curriculum:manage')
  createDraft(@CurrentAuth() auth: AuthContext, @Body({ schema: TermClassSchema }) body: z.infer<typeof TermClassSchema>, @Req() req: Request) {
    return this.timetable.createDraft(auth, body.termId, body.classGroupId, requestMeta(req));
  }

  @Post('timetable/versions/:id/slots')
  @RequirePermissions('curriculum:manage')
  addSlot(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: TimetableSlotSchema }) body: z.infer<typeof TimetableSlotSchema>, @Req() req: Request) {
    return this.timetable.addSlot(auth, id, body, requestMeta(req));
  }

  @Delete('timetable/slots/:id')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  removeSlot(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.timetable.removeSlot(auth, id, requestMeta(req));
  }

  @Delete('timetable/versions/:id')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  discardDraft(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.timetable.discardDraft(auth, id, requestMeta(req));
  }

  @Post('timetable/versions/:id/publish')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  publish(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: PublishTimetableSchema }) body: z.infer<typeof PublishTimetableSchema>, @Req() req: Request) {
    return this.timetable.publish(auth, id, body.effectiveFrom, requestMeta(req));
  }

  @Get('timetable/lens')
  @RequirePermissions('classes:read')
  async lens(@CurrentAuth() auth: AuthContext, @Query({ schema: TimetableLensQuerySchema }) q: z.infer<typeof TimetableLensQuerySchema>) {
    return this.timetable.lens(auth, q, await this.classes.today(auth));
  }

  @Get('timetable/exceptions')
  @RequirePermissions('classes:read')
  exceptions(@CurrentAuth() auth: AuthContext, @Query({ schema: ScheduleExceptionQuerySchema }) q: z.infer<typeof ScheduleExceptionQuerySchema>) {
    return this.timetable.exceptions(auth, q);
  }

  @Post('timetable/slots/:id/exceptions')
  @RequirePermissions('curriculum:manage')
  createException(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Body({ schema: ScheduleExceptionSchema }) body: z.infer<typeof ScheduleExceptionSchema>, @Req() req: Request) {
    return this.timetable.createException(auth, id, body, requestMeta(req));
  }

  @Delete('timetable/exceptions/:id')
  @HttpCode(204)
  @RequirePermissions('curriculum:manage')
  deleteException(@CurrentAuth() auth: AuthContext, @Param('id', { schema: UuidParamSchema }) id: string, @Req() req: Request) {
    return this.timetable.deleteException(auth, id, requestMeta(req));
  }

  // ───────────── Jadwal terbit untuk portal ─────────────

  /** Jadwal mengajar guru yang sedang masuk. */
  @Get('me/teaching-timetable')
  @RequirePermissions('timetable:read')
  async myTeaching(@CurrentAuth() auth: AuthContext) {
    const emp = await this.scope.employee(auth);
    const today = await this.classes.today(auth);
    if (!emp) return { term: null, periods: [], slots: [] };
    return this.timetable.forEmployee(auth.schoolId, emp.id, today);
  }

  /** Jadwal kelas untuk siswa, atau anak bagi wali (izin akademik). */
  @Get('me/class-timetable')
  async myClassTimetable(@CurrentAuth() auth: AuthContext, @Query({ schema: PortalQuery }) q: z.infer<typeof PortalQuery>) {
    const studentId = await this.scope.portalStudentId(auth, 'academic', q.studentId);
    const today = await this.classes.today(auth);
    const cls = await this.scope.classOf(studentId, today);
    if (!cls) return { term: null, periods: [], slots: [], classGroup: null, versionNo: null, publishedAt: null, effectiveFrom: null, changes: [] };
    const [timetable, version, changes] = await Promise.all([
      this.timetable.forClass(auth.schoolId, cls.id, today),
      this.timetable.publishedVersion(auth.schoolId, cls.id, today),
      this.timetable.exceptions(auth, { from: today, to: addDays(today, 14), classGroupId: cls.id }),
    ]);
    return {
      ...timetable,
      classGroup: cls,
      versionNo: version?.versionNo ?? null,
      publishedAt: version?.publishedAt?.toISOString() ?? null,
      effectiveFrom: version?.effectiveFrom ? fromDbDate(version.effectiveFrom) : null,
      changes,
    };
  }
}
