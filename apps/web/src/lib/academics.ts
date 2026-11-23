import type { AcademicOptions, ClassGroupListItem } from "@smart-school/contracts";
import { apiGet } from "./api-server";

/** Pilihan form akademik (guru aktif, ruang, semester, tingkat, program, mapel) dalam satu panggilan. */
export async function getAcademicOptions(): Promise<AcademicOptions | null> {
  const res = await apiGet<AcademicOptions>("/academics/options");
  return res.ok ? res.data : null;
}

export async function getClasses(academicYearId?: string): Promise<ClassGroupListItem[]> {
  const res = await apiGet<ClassGroupListItem[]>(`/class-groups${academicYearId ? `?academicYearId=${academicYearId}` : ""}`);
  return res.ok ? res.data : [];
}

/** Semester terpilih: dari URL, atau yang berjalan hari ini, atau yang pertama. */
export function pickTerm(options: AcademicOptions | null, termId?: string) {
  const terms = options?.terms ?? [];
  return terms.find((t) => t.id === termId) ?? terms.find((t) => t.current) ?? terms[0] ?? null;
}
