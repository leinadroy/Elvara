/**
 * Ubah lembar pertama file Excel (.xlsx) menjadi CSV di browser, agar impor memakai endpoint dan
 * aturan validasi yang sama dengan CSV. Tanggal Excel ditulis sebagai YYYY-MM-DD; angka tanpa format ribuan.
 */
export async function xlsxToCsv(file: File): Promise<string> {
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);
  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows
    .filter((r) => r.some((v) => v !== null && v !== ""))
    .map((r) => r.map(cell).join(","))
    .join("\n");
}
