import type { GradeAggregateStatus, GradeState } from '@smart-school/contracts';
import { Prisma } from '../generated/prisma/client.js';

type Entry = { state: GradeState; score: number | null };
type Component = { id: string; name: string; weight: number; entries: Entry[] };

export function aggregateGrade(components: Component[], passingScore: number | null) {
  let weighted = new Prisma.Decimal(0);
  let applicableWeight = new Prisma.Decimal(0);
  const breakdown = components.map(({ entries, ...component }) => {
    const scores = entries.flatMap((entry) =>
      entry.state === 'MISSING' ? [0] : entry.state === 'SCORED' && entry.score !== null ? [entry.score] : [],
    );
    const incomplete = entries.length === 0 || entries.some((entry) => entry.state === 'PENDING');
    const average = scores.length
      ? scores.reduce((sum, score) => sum.plus(score), new Prisma.Decimal(0)).div(scores.length)
      : null;
    if (average !== null) {
      weighted = weighted.plus(average.times(component.weight));
      applicableWeight = applicableWeight.plus(component.weight);
    }
    const status: GradeAggregateStatus = incomplete ? 'INCOMPLETE' : average === null ? 'EXCUSED' : 'COMPLETE';
    return { ...component, average: average?.toNumber() ?? null, status };
  });
  const incomplete = breakdown.some((component) => component.status === 'INCOMPLETE');
  const finalScore = incomplete || applicableWeight.isZero()
    ? null
    : weighted.div(applicableWeight).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  const status: GradeAggregateStatus = incomplete ? 'INCOMPLETE' : finalScore === null ? 'EXCUSED' : 'COMPLETE';
  return {
    components: breakdown,
    finalScore,
    status,
    needsFollowUp: finalScore === null || passingScore === null ? null : finalScore < passingScore,
  };
}
