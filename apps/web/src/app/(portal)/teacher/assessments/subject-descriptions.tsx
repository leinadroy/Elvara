import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { DescriptionForm, type LearningOutcomeOption } from "./description-form";

type StudentDescription = {
  studentId: string;
  fullName: string;
  nis: string;
  editable: boolean;
  description: { highestAchievement: string | null; needsImprovement: string | null } | null;
};

export async function SubjectDescriptions({ assignmentId }: { assignmentId: string }) {
  const [result, outcomes] = await Promise.all([
    apiGet<StudentDescription[]>(`/report-cards/subject-descriptions?teachingAssignmentId=${encodeURIComponent(assignmentId)}`),
    apiGet<LearningOutcomeOption[]>(`/report-cards/subject-outcomes?teachingAssignmentId=${encodeURIComponent(assignmentId)}`),
  ]);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.length) return <EmptyState title="Belum ada siswa dalam rombel ini" />;
  return <div className="grid gap-2">
    {result.data.map((student) => {
      const { highestAchievement, needsImprovement } = student.description ?? {};
      return <details key={student.studentId} className="rounded-lg border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          {student.fullName} · NIS {student.nis} · {highestAchievement && needsImprovement ? "Lengkap" : "Belum lengkap"}
        </summary>
        <div className="mt-3">
          {student.editable
            ? <DescriptionForm assignmentId={assignmentId} studentId={student.studentId}
                highestAchievement={highestAchievement ?? null} needsImprovement={needsImprovement ?? null} outcomes={outcomes.ok ? outcomes.data : []} />
            : <div className="space-y-2">
                <p className="text-muted-foreground">Deskripsi hanya dapat dilihat pada tahap ini.</p>
                <p className="whitespace-pre-wrap">Capaian tertinggi: {highestAchievement ?? "—"}</p>
                <p className="whitespace-pre-wrap">Perlu ditingkatkan: {needsImprovement ?? "—"}</p>
              </div>}
        </div>
      </details>;
    })}
  </div>;
}
