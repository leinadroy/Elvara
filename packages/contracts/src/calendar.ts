import { z } from 'zod';
import { isoDate } from './common.js';

// Kalender akademik (PRD R2 E10, blueprint academic_calendar_event).

export const CALENDAR_CATEGORIES = ['SEMESTER', 'EXAM', 'HOLIDAY', 'REPORT_DAY', 'DEADLINE', 'ACTIVITY'] as const;
export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];
export const CALENDAR_CATEGORY_LABELS: Record<CalendarCategory, string> = {
  SEMESTER: 'Awal/akhir semester',
  EXAM: 'Ujian',
  HOLIDAY: 'Libur',
  REPORT_DAY: 'Pembagian rapor',
  DEADLINE: 'Tenggat',
  ACTIVITY: 'Kegiatan',
};

export const CALENDAR_AUDIENCES = ['ALL', 'STAFF', 'STUDENTS_GUARDIANS', 'GRADE_LEVEL'] as const;
export type CalendarAudience = (typeof CALENDAR_AUDIENCES)[number];
export const CALENDAR_AUDIENCE_LABELS: Record<CalendarAudience, string> = {
  ALL: 'Seluruh warga sekolah',
  STAFF: 'Guru & staf',
  STUDENTS_GUARDIANS: 'Siswa & orang tua/wali',
  GRADE_LEVEL: 'Satu tingkat',
};

export type CalendarStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export const CALENDAR_STATUS_LABELS: Record<CalendarStatus, string> = { DRAFT: 'Draf', PUBLISHED: 'Terbit', CANCELLED: 'Dibatalkan' };

export const CalendarEventSchema = z
  .object({
    title: z.string().trim().min(3, { error: 'Judul minimal 3 karakter.' }).max(120),
    category: z.enum(CALENDAR_CATEGORIES),
    startsOn: isoDate,
    endsOn: isoDate,
    audience: z.enum(CALENDAR_AUDIENCES).default('ALL'),
    gradeLevelId: z.uuid().optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
    description: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((v) => v.endsOn >= v.startsOn, { path: ['endsOn'], message: 'Tanggal selesai sebelum tanggal mulai.' })
  .refine((v) => v.audience !== 'GRADE_LEVEL' || !!v.gradeLevelId, { path: ['gradeLevelId'], message: 'Pilih tingkat.' });

export const CalendarQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((v) => v.to >= v.from, { path: ['to'], message: 'Tanggal akhir sebelum tanggal awal.' });

export const CancelCalendarEventSchema = z.object({ reason: z.string().trim().min(5, { error: 'Jelaskan alasan pembatalan.' }).max(200) });

export interface CalendarEventView {
  id: string;
  title: string;
  category: CalendarCategory;
  startsOn: string;
  endsOn: string;
  audience: CalendarAudience;
  gradeLevel: { id: string; name: string } | null;
  location: string | null;
  description: string | null;
  status: CalendarStatus;
  /** Untuk pengelola: agenda ujian/libur lain yang tanggalnya beririsan (FR-10.4). */
  clashes?: { id: string; title: string; category: CalendarCategory }[];
}
