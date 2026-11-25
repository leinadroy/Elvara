import { ACTIVITY_KIND_LABELS, ACTIVITY_STATUS_LABELS, SUBMISSION_STATE_LABELS, type ActivityView, type SubmissionState, type SubmissionVersionView } from "@smart-school/contracts";
import { formatDateTime } from "@/lib/format";

/** Status ditampilkan sebagai teks + warna (blueprint). */
export function SubmissionBadge({ state }: { state: SubmissionState }) {
  const cls = state === "ON_TIME" ? "bg-secondary text-secondary-foreground" : state === "LATE" ? "border border-primary text-foreground" : "border border-dashed text-muted-foreground";
  return <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>{SUBMISSION_STATE_LABELS[state]}</span>;
}

export function ActivityStatusBadge({ status }: { status: ActivityView["status"] }) {
  const cls = status === "PUBLISHED" ? "bg-secondary" : status === "DRAFT" ? "border border-dashed text-muted-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>{ACTIVITY_STATUS_LABELS[status]}</span>;
}

export function ActivityMeta({ a }: { a: ActivityView }) {
  const overdue = new Date(a.dueAt) < new Date();
  return (
    <p className="text-sm text-muted-foreground">
      {ACTIVITY_KIND_LABELS[a.kind]} · {a.teachingAssignment.subject.name} · {a.teachingAssignment.classGroup.code} · tenggat{" "}
      <span className={overdue ? "" : "font-medium text-foreground"}>{formatDateTime(a.dueAt)}</span>
      {a.allowLate && " · terlambat diterima"}
      {!a.acceptsSubmissions && " · dikerjakan di luar aplikasi"}
    </p>
  );
}

export function VersionList({ versions }: { versions: SubmissionVersionView[] }) {
  if (!versions.length) return null;
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {[...versions].reverse().map((v) => (
        <li key={v.versionNo} className="rounded-lg bg-muted px-2 py-1.5">
          <span className="text-xs text-muted-foreground">
            Versi {v.versionNo} · {formatDateTime(v.submittedAt)}
            {v.late && " · terlambat"}
          </span>
          {v.text && <p className="whitespace-pre-line">{v.text}</p>}
          {v.file && (
            <a href={v.file.url} className="text-sm underline">
              {v.file.name} ({Math.max(1, Math.round(v.file.sizeBytes / 1024))} KB)
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
