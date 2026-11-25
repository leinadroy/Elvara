import type { FinalGrade, GradeState } from '@smart-school/contracts';

/**
 * Perhitungan nilai akhir (PRD R2 E13, ADR 0005). Fungsi murni agar bisa diuji dan direproduksi:
 *  - per komponen: rata-rata penilaian; SCORED = nilainya, MISSING (tidak mengumpulkan) = 0,
 *    EXCUSED (tidak berlaku) dikecualikan, PENDING/tanpa nilai = belum lengkap (tidak dianggap nol);
 *  - nilai akhir = Σ(bobot × rata-rata komponen) / Σ bobot, hanya bila semua komponen lengkap;
 *  - pembulatan dilakukan sekali di akhir (HALF_UP_INTEGER), bukan di setiap langkah.
 */
export interface ComputeComponent {
  code: string;
  name: string;
  weight: number;
}
export interface ComputeAssessment {
  id: string;
  title: string;
  componentCode: string;
}
export interface ComputeEntry {
  state: GradeState;
  score: number | null;
}

/** Setengah ke atas; koreksi kecil untuk galat desimal biner (mis. 84.49999999 dari 84.5). */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function computeFinal(
  components: ComputeComponent[],
  passingScore: number | null,
  assessments: ComputeAssessment[],
  entryFor: (assessmentId: string) => ComputeEntry | undefined,
): FinalGrade {
  const issues: string[] = [];
  const averages: Record<string, number | null> = {};
  const known = new Set(components.map((c) => c.code));

  for (const a of assessments) {
    if (!known.has(a.componentCode)) issues.push(`Penilaian "${a.title}" memakai komponen ${a.componentCode} yang tidak ada di skema berlaku.`);
  }

  for (const c of components) {
    const list = assessments.filter((a) => a.componentCode === c.code);
    if (!list.length) {
      averages[c.code] = null;
      issues.push(`Belum ada penilaian ${c.name}.`);
      continue;
    }
    const values: number[] = [];
    let pending = 0;
    for (const a of list) {
      const e = entryFor(a.id);
      if (!e || e.state === 'PENDING') pending++;
      else if (e.state === 'SCORED') values.push(e.score ?? 0);
      else if (e.state === 'MISSING') values.push(0);
      // EXCUSED: dikecualikan.
    }
    averages[c.code] = values.length ? round2(values.reduce((n, v) => n + v, 0) / values.length) : null;
    if (pending) issues.push(`${pending} nilai ${c.name} belum diisi.`);
    else if (!values.length) issues.push(`Semua nilai ${c.name} tidak berlaku.`);
  }

  const complete = issues.length === 0 && components.length > 0;
  if (!components.length) issues.push('Skema nilai belum terbit.');
  let raw: number | null = null;
  if (complete) {
    // Hitung dari rata-rata tanpa pembulatan antara agar pembulatan hanya sekali.
    let sum = 0;
    let weights = 0;
    for (const c of components) {
      const list = assessments.filter((a) => a.componentCode === c.code);
      const values = list
        .map((a) => entryFor(a.id))
        .filter((e): e is ComputeEntry => !!e && e.state !== 'EXCUSED' && e.state !== 'PENDING')
        .map((e) => (e.state === 'SCORED' ? (e.score ?? 0) : 0));
      sum += c.weight * (values.reduce((n, v) => n + v, 0) / values.length);
      weights += c.weight;
    }
    raw = round2(sum / weights);
  }
  const rounded = raw === null ? null : roundHalfUp(raw);
  return { components: averages, raw, rounded, complete, issues, belowPassing: passingScore !== null && rounded !== null && rounded < passingScore };
}
