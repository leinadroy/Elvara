import { describe, expect, it } from 'vitest';
import { aggregateGrade } from './grade-aggregate.js';

describe('aggregateGrade', () => {
  it('menghitung nol untuk tidak mengumpulkan dan membulatkan sekali setelah pembobotan', () => {
    const result = aggregateGrade([
      { id: 'a', name: 'Tugas', weight: 40, entries: [{ state: 'SCORED', score: 82.5 }, { state: 'MISSING', score: null }] },
      { id: 'b', name: 'Ujian', weight: 60, entries: [{ state: 'SCORED', score: 85 }] },
    ], 68);
    expect(result.components[0]?.average).toBe(41.25);
    expect(result.finalScore).toBe(68);
    expect(result.needsFollowUp).toBe(false);
  });

  it('menyesuaikan bobot untuk pengecualian dan menahan hasil jika ada data kosong', () => {
    const components = [
      { id: 'a', name: 'Tugas', weight: 40, entries: [{ state: 'EXCUSED' as const, score: null }] },
      { id: 'b', name: 'Ujian', weight: 60, entries: [{ state: 'SCORED' as const, score: 80.5 }] },
    ];
    expect(aggregateGrade(components, null).finalScore).toBe(81);
    expect(aggregateGrade([...components, { id: 'c', name: 'Proyek', weight: 10, entries: [] }], null)).toMatchObject({
      status: 'INCOMPLETE',
      finalScore: null,
    });
  });
});
