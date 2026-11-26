import type { PortalActivity } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { SubmitActivity } from "./submit-activity";

export async function PortalActivities({ studentId }: { studentId?: string }) {
  const path = studentId ? `/activities/portal?studentId=${encodeURIComponent(studentId)}` : "/activities/portal";
  const result = await apiGet<PortalActivity[]>(path);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.length) return <EmptyState title="Belum ada kegiatan yang bisa dilihat" />;
  return <ul className="grid gap-3">{result.data.map((activity) => {
    const submission = activity.submissions[0];
    return <li key={activity.id} className="grid gap-3 rounded-lg border bg-card p-4">
      <div>
        <p className="text-xs text-muted-foreground">{activity.teachingAssignment.subject.name} · Tenggat {formatDateTime(activity.dueAt)}</p>
        <h2 className="font-semibold">{activity.title}</h2>
      </div>
      {activity.instructions && <p className="whitespace-pre-wrap break-words text-sm">{activity.instructions}</p>}
      <p className="text-sm">{submission ? `Versi ${submission.latestVersionNo} · ${submission.status === "LATE" ? "Terlambat" : "Tepat waktu"} · ${formatDateTime(submission.submittedAt)}` : activity.status === "CLOSED" ? "Ditutup · Belum ada kiriman" : "Belum ada kiriman"}</p>
      {activity.canSubmit && <SubmitActivity id={activity.id} resubmit={!!submission} />}
    </li>;
  })}</ul>;
}
