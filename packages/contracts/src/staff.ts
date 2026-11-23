import { z } from 'zod';
import { isoDate } from './common.js';

// Jadwal tugas staf (work_shift, architecture_blueprint 05 bagian D). R1: diisi admin per tanggal (ADR 0004).

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Format jam HH:MM.' });

export const WORK_SHIFT_STATUSES = ['SCHEDULED', 'CANCELLED'] as const;
export type WorkShiftStatus = (typeof WORK_SHIFT_STATUSES)[number];
export const WORK_SHIFT_STATUS_LABELS: Record<WorkShiftStatus, string> = { SCHEDULED: 'Terjadwal', CANCELLED: 'Dibatalkan' };

export const WorkShiftSchema = z
  .object({
    employeeId: z.uuid({ error: 'Pilih pegawai.' }),
    title: z.string().trim().min(3, { error: 'Nama tugas minimal 3 karakter.' }).max(80),
    date: isoDate,
    startTime: time,
    endTime: time,
    roomId: z.uuid().optional().nullable(),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .refine((v) => v.endTime > v.startTime, { path: ['endTime'], message: 'Jam selesai harus setelah jam mulai.' });

export const CancelWorkShiftSchema = z.object({ reason: z.string().trim().min(5, { error: 'Jelaskan alasan pembatalan.' }).max(200) });

export const WorkShiftQuerySchema = z
  .object({ from: isoDate, to: isoDate, employeeId: z.uuid().optional() })
  .refine((v) => v.to >= v.from, { path: ['to'], message: 'Tanggal akhir sebelum tanggal awal.' });

export const MyWorkShiftQuerySchema = z.object({ from: isoDate.optional(), to: isoDate.optional() });

export interface WorkShiftView {
  id: string;
  employee: { id: string; fullName: string; position: string };
  title: string;
  /** Tanggal dan jam di zona waktu sekolah. */
  date: string;
  startTime: string;
  endTime: string;
  room: { id: string; code: string; name: string } | null;
  status: WorkShiftStatus;
  note: string | null;
  cancelReason: string | null;
}

export interface WorkShiftOptions {
  employees: { id: string; fullName: string; position: string; isTeacher: boolean }[];
  rooms: { id: string; code: string; name: string }[];
}
