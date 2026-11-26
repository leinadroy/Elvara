import type { AssignmentGradeBook } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { GradeBookTable } from "./grade-book-table";

export async function GradeBook({ assignmentId }: { assignmentId: string }) {
  const result = await apiGet<AssignmentGradeBook>(`/assessments/grade-book?teachingAssignmentId=${encodeURIComponent(assignmentId)}`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.students.length) return <EmptyState title="Belum ada siswa dalam penilaian kelas ini" />;
  return <GradeBookTable book={result.data} assignmentId={assignmentId} />;
}
