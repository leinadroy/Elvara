import { z } from 'zod';
import { PageQuerySchema } from './common.js';

export const AuditListQuerySchema = PageQuerySchema.extend({
  entityType: z.string().trim().max(50).optional(),
  entityId: z.string().trim().max(64).optional(),
  actorUserId: z.uuid().optional(),
  action: z.string().trim().max(80).optional(),
});

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
