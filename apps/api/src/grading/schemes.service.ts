import { Injectable, NotFoundException } from '@nestjs/common';
import type { GradeSchemeRow, GradeSchemeSchema, GradeSchemeView, LearningOutcomeSchema, LearningOutcomeView, UpdateGradeSchemeSchema } from '@smart-school/contracts';
import { WEIGHT_TOTAL, weightTotal } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict, validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SCHEME_INCLUDE = {
  subject: { select: { id: true, code: true, name: true } },
  gradeLevel: { select: { id: true, name: true } },
  components: { orderBy: { sortOrder: 'asc' }, select: { id: true, code: true, name: true, weight: true } },
} satisfies Prisma.GradeSchemeVersionInclude;
type SchemeRow = Prisma.GradeSchemeVersionGetPayload<{ include: typeof SCHEME_INCLUDE }>;

export function schemeView(s: SchemeRow): GradeSchemeView {
  return {
    id: s.id,
    versionNo: s.versionNo,
    status: s.status,
    subject: s.subject,
    gradeLevel: s.gradeLevel,
    passingScore: s.passingScore,
    roundingRule: s.roundingRule,
    components: s.components,
    weightTotal: weightTotal(s.components),
    publishedAt: s.publishedAt?.toISOString() ?? null,
  };
}

/**
 * Skema nilai per mapel × tingkat × semester (PRD R2 E11, ADR 0005) dan capaian pembelajaran.
 * Satu draf dan satu versi terbit per kombinasi (dijaga indeks unik parsial). Terbit tidak diubah;
 * menerbitkan draf baru membuat versi lama SUPERSEDED, sementara penilaian lama tetap menunjuk komponennya.
 */
@Injectable()
export class SchemesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async term(auth: AuthContext, termId: string) {
    const t = await this.prisma.term.findFirst({ where: { id: termId, academicYear: { schoolId: auth.schoolId } }, select: { id: true, academicYearId: true } });
    if (!t) throw new NotFoundException('Semester tidak ditemukan.');
    return t;
  }

  /** Semua kombinasi mapel × tingkat yang punya skema atau diajarkan pada semester ini. */
  async list(auth: AuthContext, termId: string): Promise<GradeSchemeRow[]> {
    await this.term(auth, termId);
    const [schemes, taught] = await Promise.all([
      this.prisma.gradeSchemeVersion.findMany({ where: { schoolId: auth.schoolId, termId, status: { in: ['DRAFT', 'PUBLISHED'] } }, include: SCHEME_INCLUDE }),
      this.prisma.teachingAssignment.findMany({
        where: { schoolId: auth.schoolId, termId },
        select: { subject: { select: { id: true, code: true, name: true } }, classGroup: { select: { gradeLevel: { select: { id: true, name: true, ordinal: true } } } } },
      }),
    ]);
    const rows = new Map<string, GradeSchemeRow & { ordinal: number }>();
    const key = (subjectId: string, gradeLevelId: string) => `${subjectId}:${gradeLevelId}`;
    for (const t of taught) {
      const g = t.classGroup.gradeLevel;
      rows.set(key(t.subject.id, g.id), { subject: t.subject, gradeLevel: { id: g.id, name: g.name }, ordinal: g.ordinal, taught: true, published: null, draft: null });
    }
    for (const s of schemes) {
      const k = key(s.subjectId, s.gradeLevelId);
      const row = rows.get(k) ?? { subject: s.subject, gradeLevel: s.gradeLevel, ordinal: 0, taught: false, published: null, draft: null };
      if (s.status === 'PUBLISHED') row.published = schemeView(s);
      else row.draft = schemeView(s);
      rows.set(k, row);
    }
    return [...rows.values()]
      .sort((a, b) => a.ordinal - b.ordinal || a.gradeLevel.name.localeCompare(b.gradeLevel.name, 'id') || a.subject.name.localeCompare(b.subject.name, 'id'))
      .map(({ ordinal: _o, ...r }) => r);
  }

  /** Versi terbit yang berlaku untuk mapel × tingkat × semester (dipakai buku nilai dan rapor). */
  async published(termId: string, subjectId: string, gradeLevelId: string) {
    const s = await this.prisma.gradeSchemeVersion.findFirst({ where: { termId, subjectId, gradeLevelId, status: 'PUBLISHED' }, include: SCHEME_INCLUDE });
    return s ? schemeView(s) : null;
  }

  async create(auth: AuthContext, input: z.infer<typeof GradeSchemeSchema>, meta: RequestMeta) {
    await this.term(auth, input.termId);
    const fe: Record<string, string[]> = {};
    if (!(await this.prisma.subject.findFirst({ where: { id: input.subjectId, schoolId: auth.schoolId } }))) fe.subjectId = ['Mata pelajaran tidak ditemukan.'];
    if (!(await this.prisma.gradeLevel.findFirst({ where: { id: input.gradeLevelId, schoolId: auth.schoolId } }))) fe.gradeLevelId = ['Tingkat tidak ditemukan.'];
    if (Object.keys(fe).length) throw validationFailed('Periksa kembali isian yang ditandai.', fe);
    const where = { termId: input.termId, subjectId: input.subjectId, gradeLevelId: input.gradeLevelId };
    if (await this.prisma.gradeSchemeVersion.findFirst({ where: { ...where, status: 'DRAFT' } })) throw conflict('Sudah ada draf skema untuk mapel dan tingkat ini. Ubah draf yang ada.');
    const last = await this.prisma.gradeSchemeVersion.findFirst({ where, orderBy: { versionNo: 'desc' }, select: { versionNo: true } });
    const row = await this.prisma.gradeSchemeVersion.create({
      data: {
        ...where,
        schoolId: auth.schoolId,
        versionNo: (last?.versionNo ?? 0) + 1,
        passingScore: input.passingScore ?? null,
        createdById: auth.userId,
        components: { create: input.components.map((c, i) => ({ ...c, sortOrder: i })) },
      },
    });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'grade_scheme.create', entityType: 'grade_scheme_version', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id, versionNo: row.versionNo };
  }

  private async draft(auth: AuthContext, id: string) {
    const s = await this.prisma.gradeSchemeVersion.findFirst({ where: { id, schoolId: auth.schoolId }, include: SCHEME_INCLUDE });
    if (!s) throw new NotFoundException('Skema tidak ditemukan.');
    if (s.status !== 'DRAFT') throw conflict('Skema terbit tidak bisa diubah. Buat draf versi baru.');
    return s;
  }

  async update(auth: AuthContext, id: string, input: z.infer<typeof UpdateGradeSchemeSchema>, meta: RequestMeta) {
    await this.draft(auth, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.gradeComponent.deleteMany({ where: { schemeVersionId: id } });
      await tx.gradeSchemeVersion.update({
        where: { id },
        data: { passingScore: input.passingScore ?? null, components: { create: input.components.map((c, i) => ({ ...c, sortOrder: i })) } },
      });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'grade_scheme.update', entityType: 'grade_scheme_version', entityId: id, requestId: meta.requestId, metadata: input }, tx);
    });
  }

  /** Draf baru dari versi terbit (salinan komponen), untuk mengubah skema yang sudah berlaku. */
  async revise(auth: AuthContext, publishedId: string, meta: RequestMeta) {
    const p = await this.prisma.gradeSchemeVersion.findFirst({ where: { id: publishedId, schoolId: auth.schoolId, status: 'PUBLISHED' }, include: SCHEME_INCLUDE });
    if (!p) throw new NotFoundException('Skema terbit tidak ditemukan.');
    return this.create(
      auth,
      { termId: p.termId, subjectId: p.subjectId, gradeLevelId: p.gradeLevelId, passingScore: p.passingScore, components: p.components.map(({ code, name, weight }) => ({ code, name, weight })) },
      meta,
    );
  }

  async publish(auth: AuthContext, id: string, meta: RequestMeta) {
    const s = await this.draft(auth, id);
    if (!s.components.length) throw conflict('Skema belum punya komponen.');
    const total = weightTotal(s.components);
    if (Math.abs(total - WEIGHT_TOTAL) > 0.001) throw conflict(`Jumlah bobot ${total}%. Harus tepat ${WEIGHT_TOTAL}% sebelum terbit.`, { components: [`Jumlah bobot ${total}%.`] });
    await this.prisma.$transaction(async (tx) => {
      await tx.gradeSchemeVersion.updateMany({ where: { termId: s.termId, subjectId: s.subjectId, gradeLevelId: s.gradeLevelId, status: 'PUBLISHED' }, data: { status: 'SUPERSEDED' } });
      await tx.gradeSchemeVersion.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: auth.userId } });
      await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'grade_scheme.publish', entityType: 'grade_scheme_version', entityId: id, requestId: meta.requestId, metadata: { versionNo: s.versionNo, subject: s.subject.code, gradeLevel: s.gradeLevel.name } }, tx);
    });
  }

  async discard(auth: AuthContext, id: string, meta: RequestMeta) {
    const s = await this.draft(auth, id);
    await this.prisma.gradeSchemeVersion.delete({ where: { id: s.id } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: 'grade_scheme.discard', entityType: 'grade_scheme_version', entityId: id, requestId: meta.requestId });
  }

  // ───────────── Capaian pembelajaran ─────────────

  async outcomes(auth: AuthContext, q: { subjectId?: string; gradeLevelId?: string }): Promise<LearningOutcomeView[]> {
    const rows = await this.prisma.learningOutcome.findMany({
      where: { schoolId: auth.schoolId, subjectId: q.subjectId, gradeLevelId: q.gradeLevelId },
      include: { subject: { select: { id: true, code: true, name: true } }, gradeLevel: { select: { id: true, name: true, ordinal: true } } },
      orderBy: [{ gradeLevel: { ordinal: 'asc' } }, { subject: { name: 'asc' } }, { code: 'asc' }],
    });
    return rows.map((r) => ({ id: r.id, subject: r.subject, gradeLevel: { id: r.gradeLevel.id, name: r.gradeLevel.name }, code: r.code, description: r.description, status: r.status }));
  }

  async saveOutcome(auth: AuthContext, id: string | null, input: z.infer<typeof LearningOutcomeSchema>, meta: RequestMeta) {
    const fe: Record<string, string[]> = {};
    if (!(await this.prisma.subject.findFirst({ where: { id: input.subjectId, schoolId: auth.schoolId } }))) fe.subjectId = ['Mata pelajaran tidak ditemukan.'];
    if (!(await this.prisma.gradeLevel.findFirst({ where: { id: input.gradeLevelId, schoolId: auth.schoolId } }))) fe.gradeLevelId = ['Tingkat tidak ditemukan.'];
    if (Object.keys(fe).length) throw validationFailed('Periksa kembali isian yang ditandai.', fe);
    const clash = await this.prisma.learningOutcome.findFirst({ where: { subjectId: input.subjectId, gradeLevelId: input.gradeLevelId, code: input.code, id: id ? { not: id } : undefined } });
    if (clash) throw conflict('Kode capaian sudah dipakai untuk mapel dan tingkat ini.', { code: ['Kode sudah dipakai.'] });
    if (id && !(await this.prisma.learningOutcome.findFirst({ where: { id, schoolId: auth.schoolId } }))) throw new NotFoundException('Capaian tidak ditemukan.');
    const row = id ? await this.prisma.learningOutcome.update({ where: { id }, data: input }) : await this.prisma.learningOutcome.create({ data: { ...input, schoolId: auth.schoolId } });
    await this.audit.record({ schoolId: auth.schoolId, actorUserId: auth.userId, action: id ? 'learning_outcome.update' : 'learning_outcome.create', entityType: 'learning_outcome', entityId: row.id, requestId: meta.requestId, metadata: input });
    return { id: row.id };
  }
}
