import { Injectable } from '@nestjs/common';
import type { PortalGradesView } from '@smart-school/contracts';
import type { AuthContext } from '../auth/auth.types.js';
import { ScopeService } from '../academics/scope.service.js';
import { fromDbDate } from '../common/dates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { aggregateGrade } from './grade-aggregate.js';

@Injectable()
export class PortalGradesService {
  constructor(private readonly prisma: PrismaService, private readonly scope: ScopeService) {}

  async list(auth: AuthContext, requestedStudentId?: string): Promise<PortalGradesView> {
    const studentId = await this.scope.portalStudentId(auth, 'academic', requestedStudentId);
    const rows = await this.prisma.gradeEntry.findMany({
      where: { studentId, assessment: { schoolId: auth.schoolId, status: 'PUBLISHED' } },
      select: {
        state: true, score: true, feedback: true,
        assessment: {
          select: {
            id: true, title: true, assessedOn: true, publishedAt: true,
            component: { select: { id: true, name: true, schemeVersion: { select: {
              id: true, versionNo: true, passingScore: true, roundingRule: true,
              components: { select: { id: true, name: true, weight: true } },
            } } } },
            teachingAssignment: { select: {
              id: true, subject: { select: { name: true } }, classGroup: { select: { code: true } },
              term: { select: { name: true, academicYear: { select: { name: true } } } },
            } },
          },
        },
      },
      orderBy: [{ assessment: { assessedOn: 'desc' } }, { assessment: { publishedAt: 'desc' } }],
    });
    const byScheme = new Map<string, typeof rows>();
    for (const row of rows) {
      const id = `${row.assessment.teachingAssignment.id}:${row.assessment.component.schemeVersion.id}`;
      const group = byScheme.get(id);
      if (group) group.push(row);
      else byScheme.set(id, [row]);
    }
    const summaries = [...byScheme].flatMap(([key, entries]) => {
      const { component, teachingAssignment } = entries[0]!.assessment;
      const scheme = component.schemeVersion;
      if (scheme.roundingRule !== 'HALF_UP_INTEGER') return [];
      const { finalScore, status } = aggregateGrade(scheme.components.map((item) => ({
        ...item, entries: entries.filter((entry) => entry.assessment.component.id === item.id),
      })), scheme.passingScore);
      return [{
        key, subject: teachingAssignment.subject.name, classCode: teachingAssignment.classGroup.code, term: teachingAssignment.term.name,
        academicYear: teachingAssignment.term.academicYear.name, versionNo: scheme.versionNo, finalScore, status,
      }];
    });
    return {
      studentId,
      summaries,
      items: rows.map((row) => ({
        assessmentId: row.assessment.id,
        title: row.assessment.title,
        assessedOn: fromDbDate(row.assessment.assessedOn)!,
        publishedAt: row.assessment.publishedAt!.toISOString(),
        subject: row.assessment.teachingAssignment.subject.name,
        classCode: row.assessment.teachingAssignment.classGroup.code,
        component: row.assessment.component.name,
        state: row.state,
        score: row.score,
        feedback: row.feedback,
      })),
    };
  }
}
