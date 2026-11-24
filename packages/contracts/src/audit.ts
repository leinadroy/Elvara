import { z } from 'zod';
import { isoDate, PageQuerySchema } from './common.js';

export const AuditListQuerySchema = PageQuerySchema.extend({
  entityType: z.string().trim().max(50).optional(),
  entityId: z.string().trim().max(64).optional(),
  actorUserId: z.uuid().optional(),
  /** Pelaku berdasarkan sebagian email (FR-9.3). */
  actor: z.string().trim().toLowerCase().max(120).optional(),
  action: z.string().trim().max(80).optional(),
  /** Periode (tanggal kalender, zona waktu sekolah), inklusif. */
  from: isoDate.optional(),
  to: isoDate.optional(),
}).refine((v) => !v.from || !v.to || v.to >= v.from, { path: ['to'], message: 'Tanggal akhir sebelum tanggal awal.' });

export interface AuditEventView {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actor: { id: string; email: string } | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
