import Link from "next/link";
import { Suspense } from "react";
import type { AssessmentGradeSheet } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { GradeRowEditor } from "../../assessments/[assessmentId]/grade-row-editor";

type Submissions = {
  assessment: { id: string } | null;
  roster: { studentId: string; nis: string; fullName: string }[];
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
  if (!assessment) return <UngradedSubmissions activityId={activityId} data={result.data} />;
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

function SubmissionBody({ activityId, submission }: { activityId: string; submission?: Submissions["submissions"][number] }) {
  return <>
    <p>{submission ? submission.status === "LATE" ? "Terlambat" : "Tepat waktu" : "Belum mengumpulkan"}</p>
    {submission?.versions.map((version, index) => <details key={version.versionNo} open={index === 0}>
      <summary className="cursor-pointer">Versi {version.versionNo} · {formatDateTime(version.submittedAt)}</summary>
      <p className="mt-2 whitespace-pre-wrap break-words">{version.text}</p>
      {version.originalName && <a className="mt-2 inline-block text-primary underline" href={`/api/v1/activities/${activityId}/submissions/${version.id}/file`}>Unduh {version.originalName}</a>}
    </details>)}
  </>;
}

/** Kegiatan tanpa nilai (mis. latihan): status kiriman per peserta, tanpa lembar nilai. */
function UngradedSubmissions({ activityId, data }: { activityId: string; data: Submissions }) {
  const byStudent = new Map(data.submissions.map((item) => [item.studentId, item]));
  const done = data.roster.filter((s) => byStudent.has(s.studentId)).length;
  return <div className="grid gap-3">
    <p className="text-sm text-muted-foreground">Kegiatan tanpa nilai · {done}/{data.roster.length} siswa sudah mengumpulkan.</p>
    {!data.roster.length && <EmptyState title="Belum ada siswa dalam rombel ini" />}
    {data.roster.map((student) => <section key={student.studentId} className="grid gap-2 rounded-lg border bg-card p-4 text-sm">
      <h3 className="font-medium">{student.fullName} <span className="font-normal text-muted-foreground">· NIS {student.nis}</span></h3>
      <SubmissionBody activityId={activityId} submission={byStudent.get(student.studentId)} />
    </section>)}
  </div>;
}

export default function ActivityReviewPage(props: PageProps<"/teacher/activities/[activityId]">) {
  return <>
    <PageHeader title="Kiriman siswa" back={{ href: "/teacher/assessments", label: "Kembali ke penilaian" }} />
    <Suspense fallback={<LoadingBlock rows={4} />}><Review {...props} /></Suspense>
  </>;
}
