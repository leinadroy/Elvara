import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GRADE_STATE_LABELS, type ActivityDetail } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ActivityMeta, ActivityStatusBadge, SubmissionBadge, VersionList } from "@/components/activities/activity-bits";
import { EditActivity } from "@/components/activities/activity-form";
import { ApiErrorState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Detail tugas" };

async function Content({ params }: PageProps<"/teacher/assignments/[activityId]">) {
  const { activityId } = await params;
  const res = await apiGet<ActivityDetail>(`/activities/${activityId}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const a = res.data;
  const gradeHref = a.assessment ? `/teacher/grades/${a.teachingAssignment.id}?isi=${a.assessment.id}` : null;
  return (
    <>
      <PageHeader title={a.title} description={<ActivityMeta a={a} />} back={{ href: `/teacher/assignments?ta=${a.teachingAssignment.id}`, label: "Daftar tugas" }} />
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ActivityStatusBadge status={a.status} />
          <span className="text-sm text-muted-foreground">Dibuka {formatDateTime(a.opensAt)}</span>
          {a.assessment && (
            <span className="text-sm text-muted-foreground">
              · Penilaian {a.assessment.component} ({a.assessment.status === "PUBLISHED" ? "terbit" : "draf"})
            </span>
          )}
        </div>
        {a.instructions && <p className="text-sm whitespace-pre-line">{a.instructions}</p>}
        {a.canEdit && (
          <div className="flex flex-wrap items-start gap-2">
            {a.status === "DRAFT" && <ActionButton path={`/activities/${a.id}/publish`} label="Terbitkan ke siswa" variant="default" />}
            {a.status === "PUBLISHED" && <ActionButton path={`/activities/${a.id}/close`} label="Tutup pengumpulan" confirm="Tutup tugas ini? Siswa tidak bisa mengirim lagi." />}
            {(a.status === "DRAFT" || a.status === "PUBLISHED") && <ActionButton path={`/activities/${a.id}/cancel`} label="Batalkan tugas" variant="ghost" confirm="Batalkan tugas ini?" />}
            {gradeHref && (
              <Link href={gradeHref} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted">
                Nilai di buku nilai
              </Link>
            )}
            {a.status !== "CANCELLED" && <EditActivity row={a} />}
          </div>
        )}
      </section>
      {a.acceptsSubmissions ? (
        <section aria-label="Kiriman siswa" className="flex flex-col gap-2">
          <h2 className="font-semibold">
            Kiriman siswa · {a.counts.onTime + a.counts.late}/{a.counts.total}
            {a.counts.late > 0 && <span className="text-sm font-normal text-muted-foreground"> ({a.counts.late} terlambat)</span>}
          </h2>
          <ul className="flex flex-col gap-2">
            {a.submissions.map((s) => (
              <li key={s.studentId} className="flex flex-col gap-2 rounded-2xl border bg-card p-3 sm:flex-row sm:items-start">
                <div className="flex min-w-48 flex-col gap-1">
                  <span className="font-medium">{s.fullName}</span>
                  <span className="text-xs text-muted-foreground">{s.nis}</span>
                  <span className="flex flex-wrap items-center gap-1">
                    <SubmissionBadge state={s.state} />
                    {s.grade && <span className="text-xs">{s.grade.state === "SCORED" ? `Nilai ${s.grade.score}` : GRADE_STATE_LABELS[s.grade.state]}</span>}
                  </span>
                </div>
                <div className="min-w-0 flex-1">{s.versions.length ? <VersionList versions={s.versions} /> : <p className="text-sm text-muted-foreground">Belum ada kiriman.</p>}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Tugas ini dikerjakan di luar aplikasi; isi nilainya lewat buku nilai.</p>
      )}
    </>
  );
}

export default function TeacherActivityPage(props: PageProps<"/teacher/assignments/[activityId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <Content {...props} />
    </Suspense>
  );
}
