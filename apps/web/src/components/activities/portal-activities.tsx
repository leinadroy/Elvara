import Link from "next/link";
import { GRADE_STATE_LABELS, type PortalActivity } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { ActivityMeta, SubmissionBadge, VersionList } from "./activity-bits";
import { SubmitForm } from "./submit-form";

function Grade({ a }: { a: PortalActivity }) {
  if (!a.grade) return a.assessment ? <span className="text-xs text-muted-foreground">Nilai belum terbit</span> : null;
  return (
    <span className="text-sm">
      Nilai: <span className="font-semibold">{a.grade.state === "SCORED" ? a.grade.score : GRADE_STATE_LABELS[a.grade.state]}</span>
      {a.grade.feedback && <span className="text-muted-foreground"> · {a.grade.feedback}</span>}
    </span>
  );
}

/** Daftar tugas siswa/anak: perlu dikerjakan, sudah dikumpulkan, lewat/ditutup. */
export async function PortalActivityList({ studentId, detailBase }: { studentId?: string; detailBase: string }) {
  const res = await apiGet<PortalActivity[]>(`/me/activities${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (!res.data.length) return <EmptyState title="Belum ada tugas" description="Tugas tampil setelah guru menerbitkannya." />;
  const todo = res.data.filter((a) => a.canSubmit && a.mine.state === "NOT_SUBMITTED");
  const submitted = res.data.filter((a) => a.mine.state !== "NOT_SUBMITTED");
  const past = res.data.filter((a) => !a.canSubmit && a.mine.state === "NOT_SUBMITTED");
  const q = studentId ? `?studentId=${studentId}` : "";
  const group = (title: string, items: PortalActivity[], empty: string) => (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="font-semibold">
        {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
      </h2>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`${detailBase}/${a.id}${q}`} className="flex flex-col gap-1 rounded-2xl border bg-card p-3 hover:border-[var(--module)]">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.title}</span>
                  {a.acceptsSubmissions && <SubmissionBadge state={a.mine.state} />}
                </span>
                <ActivityMeta a={a} />
                <Grade a={a} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
  return (
    <div className="flex flex-col gap-5">
      {group("Perlu dikerjakan", todo, "Tidak ada tugas yang menunggu.")}
      {group("Sudah dikumpulkan", submitted, "Belum ada kiriman.")}
      {past.length > 0 && group("Lewat tenggat / ditutup", past, "")}
    </div>
  );
}

/** Detail tugas untuk siswa (dengan form kirim) atau wali (hanya baca). */
export async function PortalActivityDetail({ id, studentId, canSubmitAsStudent }: { id: string; studentId?: string; canSubmitAsStudent: boolean }) {
  const res = await apiGet<PortalActivity>(`/me/activities/${id}${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const a = res.data;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
        <h1 className="text-2xl font-bold">{a.title}</h1>
        <ActivityMeta a={a} />
        <p className="text-sm text-muted-foreground">
          Guru: {a.teachingAssignment.teacher} · dibuka {formatDateTime(a.opensAt)}
        </p>
        {a.instructions && <p className="text-sm whitespace-pre-line">{a.instructions}</p>}
        <Grade a={a} />
      </section>
      {a.acceptsSubmissions && (
        <section aria-label="Pengumpulan" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            Pengumpulan <SubmissionBadge state={a.mine.state} />
          </h2>
          <VersionList versions={a.mine.versions} />
          {canSubmitAsStudent && a.canSubmit ? (
            <SubmitForm activityId={a.id} resubmit={a.mine.versions.length > 0} />
          ) : (
            a.blockedReason && <p className="text-sm text-muted-foreground">{a.blockedReason}</p>
          )}
        </section>
      )}
    </div>
  );
}
