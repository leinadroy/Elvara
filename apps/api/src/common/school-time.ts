/** Utilitas waktu sekolah: "hari ini" dan hari dalam minggu selalu mengikuti zona waktu sekolah, bukan server. */

export function todayIn(timezone: string, now = new Date()): string {
  // en-CA menghasilkan YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** 1 = Senin … 7 = Minggu untuk tanggal YYYY-MM-DD. */
export function isoDayOfWeek(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Offset zona (mis. "+07:00") untuk sebuah tanggal di zona waktu sekolah. */
function offsetOn(date: string, timezone: string): string {
  const probe = new Date(`${date}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(probe);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(tz);
  return m ? `${m[1]}:${m[2] ?? '00'}` : '+00:00';
}

/** Tanggal YYYY-MM-DD + jam HH:MM di zona waktu sekolah → Date (UTC). */
export function atTimeIn(date: string, time: string, timezone: string): Date {
  return new Date(`${date}T${time}:00${offsetOn(date, timezone)}`);
}

/** Date (UTC) → { date: YYYY-MM-DD, time: HH:MM } di zona waktu sekolah. */
export function localParts(at: Date, timezone: string): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
  return { date, time };
}

/** Batas akhir hari (23:59:59.999) sebuah tanggal di zona waktu sekolah, sebagai ISO UTC. */
export function endOfDayIn(date: string, timezone: string): string {
  // Cari offset zona untuk tanggal itu (Indonesia tanpa DST, tapi tetap dihitung umum).
  const probe = new Date(`${date}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(probe);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(tz);
  const offset = m ? `${m[1]}:${m[2] ?? '00'}` : '+00:00';
  return new Date(`${date}T23:59:59.999${offset}`).toISOString();
}
