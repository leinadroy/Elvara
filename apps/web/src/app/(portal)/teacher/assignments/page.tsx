import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { ActivityView, Gradebook, MyTeachingAssignment } from "@smart-school/contracts";
import { ActivityMeta, ActivityStatusBadge } from "@/components/activities/activity-bits";
import { ActivityForm } from "@/components/activities/activity-form";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Tugas" };
const BASE = "/teacher/assignments";

async function Content({ searchParams }: PageProps<"/teacher/assignments">) {
  const sp = flatParams(await searchParams);
  const mine = await apiGet<MyTeachingAssignment[]>("/me/teaching-assignments");
  if (!mine.ok) return <ApiErrorState status={mine.status} error={mine.error} />;
  if (!mine.data.length) return <EmptyState title="Belum ada penugasan mengajar" />;
  const ta = mine.data.find((a) => a.id === sp.ta) ?? mine.data[0]!;
  const [list, gb] = await Promise.all([apiGet<ActivityView[]>(`/activities?teachingAssignmentId=${ta.id}`), apiGet<Gradebook>(`/gradebook?teachingAssignmentId=${ta.id}`)]);
  if (!list.ok) return <ApiErrorState status={list.status} error={list.error} />;
  const components = gb.ok && gb.data.scheme ? gb.data.scheme.components.map((c) => ({ value: c.id, label: `${c.name} (${c.weight}%)` })) : [];
  return (
    <>
      <Picker action={BASE} fields={[{ name: "ta", label: "Kelas & mapel", value: ta.id, options: mine.data.map((a) => ({ value: a.id, label: `${a.classGroup.code} · ${a.subject.name} · ${a.term.name}` })) }]} />
      {list.data.length ? (
        <ul className="flex flex-col gap-2">
          {list.data.map((a) => (
            <li key={a.id}>
              <Link href={`/teacher/assignments/${a.id}`} className="flex flex-col gap-1 rounded-2xl border bg-card p-4 hover:border-[var(--module)]">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.title}</span>
                  <ActivityStatusBadge status={a.status} />
                </span>
                <ActivityMeta a={a} />
                {a.acceptsSubmissions && a.status !== "DRAFT" && (
                  <span className="text-xs text-muted-foreground">
                    {a.counts.onTime + a.counts.late}/{a.counts.total} mengumpulkan{a.counts.late ? ` · ${a.counts.late} terlambat` : ""}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Belum ada tugas untuk kelas ini" />
      )}
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Tugas baru · {ta.classGroup.code} {ta.subject.name}</h2>
        {!components.length && <p className="text-sm text-muted-foreground">Skema nilai belum terbit; tugas tetap bisa dibuat tanpa penilaian tertaut.</p>}
        <ActivityForm teachingAssignmentId={ta.id} components={components} />
      </section>
    </>
  );
}

export default function TeacherAssignmentsPage(props: PageProps<"/teacher/assignments">) {
  return (
    <>
      <PageHeader title="Tugas" description="Tugas, kuis, dan praktik untuk kelas yang Anda ajar." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
