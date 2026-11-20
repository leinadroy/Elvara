import type { PersonInputSchema, PersonView } from '@smart-school/contracts';
import type { z } from 'zod';
import { fromDbDate, toDbDate } from '../common/dates.js';
import type { Person } from '../generated/prisma/client.js';

export function personView(p: Person): PersonView {
  return {
    id: p.id,
    fullName: p.fullName,
    gender: p.gender,
    birthDate: fromDbDate(p.birthDate),
    birthPlace: p.birthPlace,
    phone: p.phone,
    email: p.email,
    address: p.address,
  };
}

type PersonInput = Partial<z.infer<typeof PersonInputSchema>>;

/** Ubah input form menjadi data Prisma; field yang tidak dikirim tidak diubah. */
export function personData(input: PersonInput) {
  return {
    fullName: input.fullName,
    gender: input.gender,
    birthDate: toDbDate(input.birthDate),
    birthPlace: input.birthPlace,
    phone: input.phone,
    email: input.email,
    address: input.address,
  };
}

/** Ringkasan perubahan untuk audit: hanya field yang berubah. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, to] of Object.entries(after)) {
    if (to === undefined) continue;
    const from = before[key] instanceof Date ? (before[key] as Date).toISOString().slice(0, 10) : before[key];
    const toNorm = to instanceof Date ? to.toISOString().slice(0, 10) : to;
    if (from !== toNorm) changes[key] = { from, to: toNorm };
  }
  return changes;
}
