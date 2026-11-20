/** Kolom @db.Date disimpan sebagai tengah malam UTC; API bertukar string YYYY-MM-DD. */
export function toDbDate(value: string): Date;
export function toDbDate(value: string | null | undefined): Date | null | undefined;
export function toDbDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export function fromDbDate(value: Date): string;
export function fromDbDate(value: Date | null): string | null;
export function fromDbDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Tanggal hari ini (UTC) sebagai YYYY-MM-DD. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
