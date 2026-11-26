import Link from "next/link";
import { Suspense } from "react";
import type { AssessmentGradeSheet } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { GradeRowEditor } from "../../assessments/[assessmentId]/grade-row-editor";

type Submissions = {
  assessment: { id: string } | null;
  submissions: {
    studentId: string;
    status: "ON_TIME" | "LATE";
    versions: { id: string; originalName: string | null; versionNo: number; submittedAt: string; text: string | null }[];
  }[];
};

async function Review({ params }: PageProps<"/teacher/activities/[activityId]">) {
  const { activityId } = await params;
  const result = await apiGet<Submissions>(`/activities/${encodeURIComponent(activityId)}/submissions`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  const { assessment, submissions } = result.data;
  if (!assessment) return <EmptyState title="Kegiatan belum memiliki lembar nilai" />;
  const sheet = await apiGet<AssessmentGradeSheet>(`/assessments/${assessment.id}/grades`);
  if (!sheet.ok) return <ApiErrorState status={sheet.status} error={sheet.error} />;
  const byStudent = new Map(submissions.map((item) => [item.studentId, item]));
  return <div className="grid gap-3">
    <h2 className="font-semibold">{sheet.data.assessment.title}</h2>
    <Link className="text-sm text-primary hover:underline" href={`/teacher/assessments/${assessment.id}`}>Buka lembar nilai</Link>
    {!sheet.data.students.length && <EmptyState title="Belum ada siswa dalam lembar nilai" />}
    {sheet.data.students.map((student) => {
      const submission = byStudent.get(student.studentId);
      return <section key={student.studentId} className="rounded-lg border bg-card">
        <div className="grid gap-2 p-4 text-sm">
          <h3 className="font-medium">{student.fullName}</h3>
          <p>{submission ? submission.status === "LATE" ? "Terlambat" : "Tepat waktu" : "Belum mengumpulkan"}</p>
          {submission?.versions.map((version, index) => <details key={version.versionNo} open={index === 0}>
            <summary className="cursor-pointer">Versi {version.versionNo} · {formatDateTime(version.submittedAt)}</summary>
            <p className="mt-2 whitespace-pre-wrap break-words">{version.text}</p>
            {version.originalName && <a className="mt-2 inline-block text-primary underline" href={`/api/v1/activities/${activityId}/submissions/${version.id}/file`}>Unduh {version.originalName}</a>}
          </details>)}
        </div>
        {sheet.data.assessment.status === "DRAFT" && <GradeRowEditor key={student.versionNo} row={student} assessmentId={assessment.id} />}
      </section>;
    })}
  </div>;
}

export default function ActivityReviewPage(props: PageProps<"/teacher/activities/[activityId]">) {
  return <>
    <PageHeader title="Kiriman siswa" back={{ href: "/teacher/assessments", label: "Kembali ke penilaian" }} />
    <Suspense fallback={<LoadingBlock rows={4} />}><Review {...props} /></Suspense>
  </>;
}
