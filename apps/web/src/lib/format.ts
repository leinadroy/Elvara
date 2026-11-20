const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/** YYYY-MM-DD → "13 Juli 2026". Tanggal tanpa jam diperlakukan sebagai tanggal kalender (tanpa geser zona). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dateFmt.format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}
