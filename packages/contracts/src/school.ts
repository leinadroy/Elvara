import { z } from 'zod';
import { isoDate, optionalText } from './common.js';

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,12}$/, { error: 'Kode hanya huruf, angka, dan tanda hubung (maks. 12).' });

export const UpdateSchoolSchema = z.object({
  name: z.string().trim().min(3).max(150),
  npsn: optionalText(20),
  address: optionalText(300),
});

export const CreateBuildingSchema = z.object({
  code,
  name: z.string().trim().min(1).max(100),
});

export const CreateFloorSchema = z.object({
  level: z.coerce.number().int().min(1).max(50),
  name: z.string().trim().min(1).max(50),
});

export const ROOM_TYPES = ['CLASSROOM', 'LAB', 'LIBRARY', 'OFFICE', 'SPORTS', 'HALL', 'OTHER'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  CLASSROOM: 'Ruang kelas',
  LAB: 'Laboratorium',
  LIBRARY: 'Perpustakaan',
  OFFICE: 'Kantor',
  SPORTS: 'Olahraga',
  HALL: 'Aula',
  OTHER: 'Lainnya',
};

export const CreateRoomSchema = z.object({
  floorId: z.uuid(),
  code,
  name: z.string().trim().min(1).max(100),
  type: z.enum(ROOM_TYPES).default('CLASSROOM'),
  capacity: z.coerce.number().int().min(1).max(2000).optional().nullable(),
});

export const UpdateRoomSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(ROOM_TYPES).optional(),
  capacity: z.coerce.number().int().min(1).max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export interface RoomView {
  id: string;
  code: string;
  name: string;
  type: RoomType;
  capacity: number | null;
  isActive: boolean;
}
export interface FloorView {
  id: string;
  level: number;
  name: string;
  rooms: RoomView[];
}
export interface BuildingView {
  id: string;
  code: string;
  name: string;
  floors: FloorView[];
}
export interface SchoolView {
  id: string;
  name: string;
  npsn: string | null;
  address: string | null;
  timezone: string;
}

// ───────────── Tahun ajaran ─────────────

const TermInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  sequence: z.coerce.number().int().min(1).max(6),
  startDate: isoDate,
  endDate: isoDate,
});

export const CreateAcademicYearSchema = z
  .object({
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/, { error: 'Format nama: 2026/2027.' }),
    startDate: isoDate,
    endDate: isoDate,
    terms: z.array(TermInputSchema).min(1, { error: 'Tambahkan minimal satu semester.' }).max(6),
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Tanggal selesai sebelum tanggal mulai.' });
    }
    const sorted = [...v.terms].sort((a, b) => a.startDate.localeCompare(b.startDate));
    sorted.forEach((t, i) => {
      const idx = v.terms.indexOf(t);
      if (t.endDate < t.startDate) {
        ctx.addIssue({ code: 'custom', path: ['terms', idx, 'endDate'], message: 'Tanggal selesai sebelum tanggal mulai.' });
      }
      if (t.startDate < v.startDate || t.endDate > v.endDate) {
        ctx.addIssue({ code: 'custom', path: ['terms', idx, 'startDate'], message: 'Semester harus berada di dalam tahun ajaran.' });
      }
      const next = sorted[i + 1];
      if (next && next.startDate <= t.endDate) {
        ctx.addIssue({ code: 'custom', path: ['terms', v.terms.indexOf(next), 'startDate'], message: 'Semester tidak boleh tumpang tindih.' });
      }
    });
    if (new Set(v.terms.map((t) => t.sequence)).size !== v.terms.length) {
      ctx.addIssue({ code: 'custom', path: ['terms'], message: 'Urutan semester tidak boleh sama.' });
    }
  });
export type CreateAcademicYearInput = z.input<typeof CreateAcademicYearSchema>;

export type AcademicYearStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export const ACADEMIC_YEAR_STATUS_LABELS: Record<AcademicYearStatus, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Aktif',
  CLOSED: 'Ditutup',
};

export interface AcademicYearView {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  terms: { id: string; name: string; sequence: number; startDate: string; endDate: string }[];
}
