import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2, { error: 'Ketik minimal 2 huruf.' }).max(60),
});

export interface SearchHit {
  id: string;
  kind: 'student' | 'employee' | 'guardian';
  title: string;
  subtitle: string;
  href: string;
}

/** Hasil pencarian global, sudah disaring sesuai hak akses peran aktif. Menu dicari di sisi web. */
export interface SearchResult {
  hits: SearchHit[];
}
