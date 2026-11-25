/** Utilitas berkas unggahan bersama (dokumen pribadi R0, kiriman tugas R2). */

export interface UploadedFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

/** Jenis file dikenali dari byte awal (magic number), bukan dari ekstensi atau Content-Type kiriman browser. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Nama file aman untuk header Content-Disposition. */
export function safeFileName(name: string, mime: string, fallback = 'dokumen'): string {
  const base = name.replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N} ._-]+/gu, '_').trim().slice(0, 80) || fallback;
  return `${base}.${EXT[mime] ?? 'bin'}`;
}

/** Batas keras di level parser; batas sebenarnya (MAX_UPLOAD_MB) diperiksa di service. */
export const UPLOAD_HARD_LIMIT = 50 * 1024 * 1024;
