import type { Metadata } from "next";
import { Suspense } from "react";
import type { Gradebook } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { GradebookView } from "./gradebook-view";
import { NewAssessmentForm } from "./grade-panel";

export const metadata: Metadata = { title: "Buku nilai" };

async function Content({ params }: PageProps<"/teacher/grades/[assignmentId]">) {
  const { assignmentId } = await params;
  const res = await apiGet<Gradebook>(`/gradebook?teachingAssignmentId=${assignmentId}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const gb = res.data;
  return (
    <>
      <PageHeader
        title={`${gb.assignment.subject.name} · ${gb.assignment.classGroup.code}`}
        description={`${gb.assignment.term.name} · ${gb.assignment.teacher}${gb.canEdit ? "" : " · hanya baca"}`}
        back={{ href: gb.canEdit ? "/teacher/grades" : `/academics/classes/${gb.assignment.classGroup.id}?tab=penugasan`, label: gb.canEdit ? "Buku nilai saya" : "Rombel" }}
      />
      {gb.scheme ? (
        <p className="text-sm text-muted-foreground">
          Skema v{gb.scheme.versionNo}: {gb.scheme.components.map((c) => `${c.name} ${c.weight}%`).join(" · ")}
          {gb.scheme.passingScore != null && ` · KKTP ${gb.scheme.passingScore}`}
        </p>
      ) : (
        <EmptyState title="Skema nilai belum terbit" description="Penilaian bisa dibuat setelah bagian kurikulum menerbitkan skema nilai untuk mapel dan tingkat ini." />
      )}
      {gb.rows.length === 0 ? (
        <EmptyState title="Belum ada siswa di rombel ini" />
      ) : gb.assessments.length ? (
        <GradebookView gb={gb} />
      ) : (
        <EmptyState title="Belum ada penilaian" description={gb.canEdit && gb.scheme ? "Tambahkan penilaian pertama di bawah." : undefined} />
      )}
      {gb.canEdit && gb.scheme && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Penilaian baru</h2>
          <NewAssessmentForm teachingAssignmentId={gb.assignment.id} components={gb.scheme.components.map((c) => ({ value: c.id, label: `${c.name} (${c.weight}%)` }))} />
        </section>
      )}
    </>
  );
}

export default function GradebookPage(props: PageProps<"/teacher/grades/[assignmentId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <Content {...props} />
    </Suspense>
  );
}
