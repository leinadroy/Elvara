import { computeFinal, roundHalfUp, type ComputeEntry } from './compute.js';

const scheme = [
  { code: 'F', name: 'Formatif', weight: 30 },
  { code: 'STS', name: 'Sumatif tengah', weight: 30 },
  { code: 'SAS', name: 'Sumatif akhir', weight: 40 },
];
const assessments = [
  { id: 'f1', title: 'Tugas 1', componentCode: 'F' },
  { id: 'f2', title: 'Tugas 2', componentCode: 'F' },
  { id: 'sts', title: 'STS', componentCode: 'STS' },
  { id: 'sas', title: 'SAS', componentCode: 'SAS' },
];
const entries = (m: Record<string, ComputeEntry>) => (id: string) => m[id];
const S = (score: number): ComputeEntry => ({ state: 'SCORED', score });

describe('computeFinal', () => {
  it('menghitung rata-rata komponen berbobot dan membulatkan sekali', () => {
    const r = computeFinal(scheme, 75, assessments, entries({ f1: S(80), f2: S(91), sts: S(70), sas: S(88) }));
    // F = 85.5; akhir = 0.3*85.5 + 0.3*70 + 0.4*88 = 25.65 + 21 + 35.2 = 81.85 → 82
    expect(r).toMatchObject({ complete: true, raw: 81.85, rounded: 82, belowPassing: false, issues: [] });
    expect(r.components).toEqual({ F: 85.5, STS: 70, SAS: 88 });
  });

  it('kosong bukan nol: nilai belum diisi membuat akhir belum lengkap', () => {
    const r = computeFinal(scheme, 75, assessments, entries({ f1: S(80), sts: S(70), sas: S(88) }));
    expect(r.complete).toBe(false);
    expect(r.rounded).toBeNull();
    expect(r.issues).toEqual(['1 nilai Formatif belum diisi.']);
    expect(r.components.F).toBe(80);
  });

  it('tidak mengumpulkan dihitung 0, tidak berlaku dikecualikan', () => {
    const missing = computeFinal(scheme, null, assessments, entries({ f1: S(80), f2: { state: 'MISSING', score: null }, sts: S(70), sas: S(90) }));
    expect(missing.components.F).toBe(40);
    const excused = computeFinal(scheme, null, assessments, entries({ f1: S(80), f2: { state: 'EXCUSED', score: null }, sts: S(70), sas: S(90) }));
    expect(excused.components.F).toBe(80);
    expect(excused.raw).toBe(81);
  });

  it('komponen tanpa penilaian dan di bawah KKTP', () => {
    const noSas = computeFinal(scheme, 75, assessments.slice(0, 3), entries({ f1: S(60), f2: S(60), sts: S(60) }));
    expect(noSas.issues).toEqual(['Belum ada penilaian Sumatif akhir.']);
    const low = computeFinal(scheme, 75, assessments, entries({ f1: S(70), f2: S(70), sts: S(74), sas: S(74.5) }));
    expect(low).toMatchObject({ complete: true, rounded: 73, belowPassing: true });
  });

  it('semua nilai tidak berlaku pada satu komponen → belum lengkap', () => {
    const r = computeFinal(scheme, null, assessments, entries({ f1: { state: 'EXCUSED', score: null }, f2: { state: 'EXCUSED', score: null }, sts: S(70), sas: S(88) }));
    expect(r.issues).toEqual(['Semua nilai Formatif tidak berlaku.']);
  });

  it('penilaian dengan komponen di luar skema berlaku ditandai', () => {
    const r = computeFinal(scheme, null, [...assessments, { id: 'old', title: 'Praktik lama', componentCode: 'PRAK' }], entries({ f1: S(80), f2: S(80), sts: S(80), sas: S(80), old: S(10) }));
    expect(r.complete).toBe(false);
    expect(r.issues[0]).toContain('PRAK');
  });

  it('skema kosong tidak menghasilkan nilai', () => {
    expect(computeFinal([], null, [], () => undefined)).toMatchObject({ complete: false, rounded: null, issues: ['Skema nilai belum terbit.'] });
  });
});

describe('roundHalfUp', () => {
  it('setengah ke atas, tahan galat desimal', () => {
    expect([roundHalfUp(84.5), roundHalfUp(84.49), roundHalfUp(0.1 + 0.2 + 84.2), roundHalfUp(84.49999999999)]).toEqual([85, 84, 85, 85]);
  });
});
