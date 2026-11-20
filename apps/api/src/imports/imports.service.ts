import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import {
  CreateStudentSchema,
  STUDENT_IMPORT_COLUMNS,
  STUDENT_IMPORT_REQUIRED,
  type ImportBatchDetail,
  type ImportBatchSummary,
  type ImportRowStatus,
} from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { validationFailed } from '../common/api-exception.filter.js';
import { toDbDate } from '../common/dates.js';
import type { RequestMeta } from '../common/request-meta.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_ROWS = 2000;

/** Nama field skema → nama kolom CSV, untuk pesan kesalahan yang dimengerti operator. */
const FIELD_TO_COLUMN: Record<string, string> = {
  nis: 'nis',
  fullName: 'nama_lengkap',
  gender: 'jenis_kelamin',
  birthDate: 'tanggal_lahir',
  birthPlace: 'tempat_lahir',
  nisn: 'nisn',
  email: 'email',
  phone: 'telepon',
};

type RowResult = { rowNumber: number; status: ImportRowStatus; message: string | null; entityId: string | null };
type ValidRow = { rowNumber: number; data: z.infer<typeof CreateStudentSchema> };

const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Impor siswa dari CSV. Aman diulang: siswa dengan NIS dan nama yang sama dilewati (SKIPPED),
   * bukan dibuat ganda. Baris bermasalah dilaporkan per baris tanpa menggagalkan baris lain.
   */
  async importStudents(auth: AuthContext, input: { fileName?: string; content: string }, meta: RequestMeta): Promise<ImportBatchDetail> {
    const records = this.parseCsv(input.content);
    const [header, ...rows] = records;
    const columns = header!.map((h) => h.trim().toLowerCase());
    const missing = STUDENT_IMPORT_REQUIRED.filter((c) => !columns.includes(c));
    const unknown = columns.filter((c) => c && !(STUDENT_IMPORT_COLUMNS as readonly string[]).includes(c));
    if (missing.length || unknown.length) {
      throw validationFailed('Header CSV tidak sesuai templat.', {
        content: [
          ...(missing.length ? [`Kolom wajib tidak ada: ${missing.join(', ')}.`] : []),
          ...(unknown.length ? [`Kolom tidak dikenal: ${unknown.join(', ')}.`] : []),
        ],
      });
    }
    if (rows.length === 0) throw validationFailed('File tidak berisi baris data.', { content: ['Tidak ada baris data di bawah header.'] });
    if (rows.length > MAX_ROWS) throw validationFailed(`Maksimal ${MAX_ROWS} baris per impor.`, { content: [`File berisi ${rows.length} baris.`] });

    const results: RowResult[] = [];
    const valid: ValidRow[] = [];
    rows.forEach((cells, i) => {
      const rowNumber = i + 2; // baris 1 = header
      const raw = Object.fromEntries(columns.map((c, idx) => [c, (cells[idx] ?? '').trim()]));
      const gender = raw.jenis_kelamin?.toUpperCase();
      if (gender && !['L', 'P'].includes(gender)) {
        results.push({ rowNumber, status: 'ERROR', message: 'jenis_kelamin: isi L atau P.', entityId: null });
        return;
      }
      const parsed = CreateStudentSchema.safeParse({
        nis: raw.nis,
        fullName: raw.nama_lengkap,
        gender: gender === 'L' ? 'MALE' : gender === 'P' ? 'FEMALE' : null,
        birthDate: raw.tanggal_lahir || null,
        birthPlace: raw.tempat_lahir,
        nisn: raw.nisn,
        email: raw.email,
        phone: raw.telepon,
      });
      if (!parsed.success) {
        const message = parsed.error.issues.map((iss) => `${FIELD_TO_COLUMN[String(iss.path[0])] ?? iss.path.join('.')}: ${iss.message}`).join(' ');
        results.push({ rowNumber, status: 'ERROR', message, entityId: null });
        return;
      }
      valid.push({ rowNumber, data: parsed.data });
    });

    // Bandingkan dengan data yang sudah ada dan dengan baris lain di file yang sama.
    const nisList = valid.map((v) => v.data.nis);
    const nisnList = valid.map((v) => v.data.nisn).filter((v): v is string => !!v);
    const existing = await this.prisma.student.findMany({
      where: { schoolId: auth.schoolId, OR: [{ nis: { in: nisList } }, { nisn: { in: nisnList } }] },
      include: { person: { select: { fullName: true } } },
    });
    const byNis = new Map(existing.map((s) => [s.nis, s]));
    const byNisn = new Map(existing.filter((s) => s.nisn).map((s) => [s.nisn!, s]));
    const seenNis = new Map<string, number>();
    const seenNisn = new Map<string, number>();
    const toCreate: ValidRow[] = [];

    for (const row of valid) {
      const { nis, nisn, fullName } = row.data;
      const dupRow = seenNis.get(nis) ?? (nisn ? seenNisn.get(nisn) : undefined);
      seenNis.set(nis, seenNis.get(nis) ?? row.rowNumber);
      if (nisn) seenNisn.set(nisn, seenNisn.get(nisn) ?? row.rowNumber);
      if (dupRow !== undefined) {
        results.push({ rowNumber: row.rowNumber, status: 'ERROR', message: `NIS/NISN sama dengan baris ${dupRow} di file ini.`, entityId: null });
        continue;
      }
      const sameNis = byNis.get(nis);
      if (sameNis) {
        if (normalizeName(sameNis.person.fullName) === normalizeName(fullName)) {
          results.push({ rowNumber: row.rowNumber, status: 'SKIPPED', message: 'Siswa sudah ada (NIS dan nama sama).', entityId: sameNis.id });
        } else {
          results.push({ rowNumber: row.rowNumber, status: 'ERROR', message: `NIS sudah dipakai oleh ${sameNis.person.fullName}.`, entityId: null });
        }
        continue;
      }
      const sameNisn = nisn ? byNisn.get(nisn) : undefined;
      if (sameNisn) {
        results.push({ rowNumber: row.rowNumber, status: 'ERROR', message: `NISN sudah dipakai oleh ${sameNisn.person.fullName}.`, entityId: null });
        continue;
      }
      toCreate.push(row);
    }

    const checksum = createHash('sha256').update(input.content).digest('hex');
    const previous = await this.prisma.importBatch.findFirst({ where: { schoolId: auth.schoolId, kind: 'STUDENTS', checksum } });

    const batch = await this.prisma.$transaction(
      async (tx) => {
        for (const row of toCreate) {
          const d = row.data;
          const person = await tx.person.create({
            data: {
              schoolId: auth.schoolId,
              fullName: d.fullName,
              gender: d.gender ?? null,
              birthDate: toDbDate(d.birthDate) ?? null,
              birthPlace: d.birthPlace,
              email: d.email,
              phone: d.phone,
              createdById: auth.userId,
              updatedById: auth.userId,
            },
          });
          const student = await tx.student.create({ data: { personId: person.id, schoolId: auth.schoolId, nis: d.nis, nisn: d.nisn } });
          results.push({ rowNumber: row.rowNumber, status: 'CREATED', message: null, entityId: student.id });
        }
        results.sort((a, b) => a.rowNumber - b.rowNumber);
        const count = (s: ImportRowStatus) => results.filter((r) => r.status === s).length;
        const created = await tx.importBatch.create({
          data: {
            schoolId: auth.schoolId,
            kind: 'STUDENTS',
            fileName: input.fileName ?? null,
            checksum,
            totalRows: rows.length,
            createdCount: count('CREATED'),
            skippedCount: count('SKIPPED'),
            errorCount: count('ERROR'),
            createdById: auth.userId,
            rows: { create: results },
          },
        });
        await this.audit.record(
          {
            schoolId: auth.schoolId,
            actorUserId: auth.userId,
            action: 'import.students',
            entityType: 'import_batch',
            entityId: created.id,
            requestId: meta.requestId,
            metadata: { fileName: input.fileName ?? null, total: rows.length, created: created.createdCount, skipped: created.skippedCount, errors: created.errorCount, repeat: !!previous },
          },
          tx,
        );
        return created;
      },
      { timeout: 60_000 },
    );

    return { ...this.summary(batch, !!previous), rows: results };
  }

  async list(auth: AuthContext): Promise<ImportBatchSummary[]> {
    const batches = await this.prisma.importBatch.findMany({ where: { schoolId: auth.schoolId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return batches.map((b) => this.summary(b, false));
  }

  async get(auth: AuthContext, id: string): Promise<ImportBatchDetail> {
    const b = await this.prisma.importBatch.findFirst({ where: { id, schoolId: auth.schoolId }, include: { rows: { orderBy: { rowNumber: 'asc' } } } });
    if (!b) throw new NotFoundException('Riwayat impor tidak ditemukan.');
    return {
      ...this.summary(b, false),
      rows: b.rows.map((r) => ({ rowNumber: r.rowNumber, status: r.status, message: r.message, entityId: r.entityId })),
    };
  }

  private summary(
    b: { id: string; fileName: string | null; totalRows: number; createdCount: number; skippedCount: number; errorCount: number; createdAt: Date },
    isRepeat: boolean,
  ): ImportBatchSummary {
    return {
      id: b.id,
      fileName: b.fileName,
      totalRows: b.totalRows,
      createdCount: b.createdCount,
      skippedCount: b.skippedCount,
      errorCount: b.errorCount,
      createdAt: b.createdAt.toISOString(),
      isRepeat,
    };
  }

  private parseCsv(content: string): string[][] {
    const firstLine = content.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
    const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
    try {
      const records = parse(content, { bom: true, delimiter, skip_empty_lines: true, relax_column_count: true }) as string[][];
      if (!records.length) throw new Error('empty');
      return records;
    } catch (err) {
      throw validationFailed('File CSV tidak dapat dibaca.', {
        content: [err instanceof Error && err.message !== 'empty' ? `Format CSV tidak valid: ${err.message}` : 'File kosong.'],
      });
    }
  }
}
