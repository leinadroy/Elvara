import { z } from 'zod';
import { ROLE_KEYS, type RoleKey } from './auth.js';

export const AUDIENCE_KINDS = ['ALL', 'STAFF', 'STUDENTS', 'GUARDIANS', 'CLASS_GROUP', 'BUILDING', 'ROLE'] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];
export const AUDIENCE_LABELS: Record<AudienceKind, string> = {
  ALL: 'Seluruh warga sekolah',
  STAFF: 'Guru & staf',
  STUDENTS: 'Siswa',
  GUARDIANS: 'Orang tua / wali',
  CLASS_GROUP: 'Satu rombel (siswa, wali, dan guru kelas)',
  BUILDING: 'Satu gedung (warga rombel yang berkelas di gedung itu)',
  ROLE: 'Satu peran tertentu',
};

export const CreateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(5, { error: 'Judul minimal 5 karakter.' }).max(150),
    body: z.string().trim().min(10, { error: 'Isi minimal 10 karakter.' }).max(5000),
    audienceKind: z.enum(AUDIENCE_KINDS),
    classGroupId: z.uuid().optional().nullable(),
    buildingId: z.uuid().optional().nullable(),
    audienceRole: z.enum(ROLE_KEYS).optional().nullable(),
    /** Kosong = terbit sekarang. */
    publishAt: z.iso.datetime({ offset: true }).optional().nullable(),
  })
  .refine((v) => v.audienceKind !== 'CLASS_GROUP' || !!v.classGroupId, { path: ['classGroupId'], message: 'Pilih rombel.' })
  .refine((v) => v.audienceKind !== 'BUILDING' || !!v.buildingId, { path: ['buildingId'], message: 'Pilih gedung.' })
  .refine((v) => v.audienceKind !== 'ROLE' || !!v.audienceRole, { path: ['audienceRole'], message: 'Pilih peran.' });

export interface AnnouncementView {
  id: string;
  title: string;
  body: string;
  audienceKind: AudienceKind;
  classGroup: { id: string; code: string } | null;
  building: { id: string; code: string; name: string } | null;
  audienceRole: RoleKey | null;
  status: 'SCHEDULED' | 'PUBLISHED' | 'WITHDRAWN';
  publishAt: string;
  withdrawnAt: string | null;
  author: string | null;
  /** Untuk penerbit: jumlah penerima notifikasi saat terbit. */
  recipientCount?: number;
}

export interface NotificationView {
  id: string;
  eventType: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export const NotificationQuerySchema = z.object({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
