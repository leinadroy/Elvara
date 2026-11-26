import Link from "next/link";
import type { TeacherAssessmentOption } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { ActivityForm } from "./activity-form";

type Activity = {
  id: string; title: string; teachingAssignmentId: string; dueAt: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";
  assessment: { id: string } | null;
};

const labels = { DRAFT: "Draf", PUBLISHED: "Terbit", CLOSED: "Ditutup", CANCELLED: "Dibatalkan" };

export async function TeacherActivities({ assignment }: { assignment: TeacherAssessmentOption }) {
  const result = await apiGet<Activity[]>("/activities/teaching");
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  const activities = result.data.filter((row) => row.teachingAssignmentId === assignment.teachingAssignmentId);
  return <div className="grid gap-3">
    {assignment.components.length > 0 && <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer font-medium">Buat kegiatan</summary>
      <div className="mt-4"><ActivityForm key={assignment.teachingAssignmentId} assignment={assignment} /></div>
    </details>}
    {!activities.length && <EmptyState title="Belum ada kegiatan untuk kelas ini" />}
    {activities.map((activity) => {
      const path = `/activities/${activity.id}/status`;
      return <article className="grid gap-2 rounded-lg border bg-card p-4 text-sm" key={activity.id}>
        <h3 className="font-medium"><Link className="text-primary hover:underline" href={`/teacher/activities/${activity.id}`}>{activity.title}</Link></h3>
        <p className="text-muted-foreground">{labels[activity.status]} · Tenggat {formatDateTime(activity.dueAt)}</p>
        <div className="flex flex-wrap gap-2">
          {activity.status === "DRAFT" && <ActionButton path={path} body={{ status: "PUBLISHED" }} label="Terbitkan" />}
          {activity.status === "PUBLISHED" && <ActionButton path={path} body={{ status: "CLOSED" }} label="Tutup pengumpulan" confirm="Tutup pengumpulan kegiatan ini?" />}
          {activity.status !== "CANCELLED" && <ActionButton path={path} body={{ status: "CANCELLED" }} label="Batalkan" confirm="Batalkan kegiatan ini?" />}
        </div>
      </article>;
    })}
  </div>;
}
