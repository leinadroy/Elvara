import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { AssessmentView, TeacherAssessmentOption } from "@smart-school/contracts";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { AssessmentForm } from "./assessment-form";
import { GradeRecap } from "./grade-recap";
import { TeacherActivities } from "./teacher-activities";
import { SubjectDescriptions } from "./subject-descriptions";
import { GradeBook } from "./assignment-grade-book";

export const metadata: Metadata = { title: "Penilaian" };
const BASE = "/teacher/assessments";

async function Content({ searchParams }: PageProps<"/teacher/assessments">) {
  const sp = flatParams(await searchParams);
  const options = await apiGet<TeacherAssessmentOption[]>("/assessments/options");
  if (!options.ok) return <ApiErrorState status={options.status} error={options.error} />;
  if (!options.data.length) return <EmptyState title="Belum ada kelas yang Anda ajar" description="Penugasan mengajar pada tahun ajaran aktif akan tampil di sini." />;
  const assignment = options.data.find((item) => item.teachingAssignmentId === sp.teachingAssignmentId) ?? options.data[0]!;
  const list = await apiGet<AssessmentView[]>(`/assessments?teachingAssignmentId=${assignment.teachingAssignmentId}`);
  if (!list.ok) return <ApiErrorState status={list.status} error={list.error} />;

  return (
    <div className="flex flex-col gap-5">
      <Picker action={BASE} fields={[{ name: "teachingAssignmentId", label: "Kelas dan mata pelajaran", value: assignment.teachingAssignmentId, options: options.data.map((item) => ({ value: item.teachingAssignmentId, label: `${item.classCode} · ${item.subjectName} · ${item.termName}` })) }]} />
      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Buat penilaian draf</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Setelah membuat draf, buka judul penilaian untuk mengisi dan menerbitkan nilai.</p>
        {assignment.components.length ? <AssessmentForm assignment={assignment} /> : <p className="text-sm text-muted-foreground">Skema nilai untuk kelas ini belum diterbitkan oleh kurikulum.</p>}
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Penilaian kelas ini</h2>
        {list.data.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {list.data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div><Link href={`${BASE}/${item.id}`} className="font-medium text-primary hover:underline">{item.title}</Link><p className="mt-1 text-muted-foreground">{item.component.name} · {item.assessedOn ? formatDate(item.assessedOn) : "Tanggal belum ditentukan"}</p></div>
                <span className="rounded-md border px-2 py-1 text-xs">{item.status === "DRAFT" ? "Draf" : "Terbit"}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Belum ada penilaian" description="Buat penilaian draf pertama untuk kelas ini." />}
      </section>
      {list.data.length > 0 && <section className="min-w-0" aria-labelledby="grade-book-title">
        <h2 id="grade-book-title" className="mb-3 font-semibold">Buku nilai kelas</h2>
        <Suspense key={assignment.teachingAssignmentId} fallback={<LoadingBlock rows={4} />}>
          <GradeBook assignmentId={assignment.teachingAssignmentId} />
        </Suspense>
      </section>}
      <section className="min-w-0" aria-labelledby="grade-recap-title">
        <h2 id="grade-recap-title" className="mb-1 font-semibold">Rekap nilai</h2>
        <p className="mb-3 text-sm text-muted-foreground">Berdasarkan penilaian terbit. Rata-rata komponen ditampilkan hingga dua desimal.</p>
        <Suspense key={assignment.teachingAssignmentId} fallback={<LoadingBlock rows={4} />}>
          <GradeRecap assignmentId={assignment.teachingAssignmentId} />
        </Suspense>
      </section>
      <section aria-labelledby="activities-title">
        <h2 id="activities-title" className="mb-3 font-semibold">Tugas dan kegiatan</h2>
        <Suspense key={assignment.teachingAssignmentId} fallback={<LoadingBlock rows={3} />}>
          <TeacherActivities assignment={assignment} />
        </Suspense>
      </section>
      <section aria-labelledby="subject-descriptions-title">
        <h2 id="subject-descriptions-title" className="mb-3 font-semibold">Deskripsi capaian rapor</h2>
        <Suspense key={assignment.teachingAssignmentId} fallback={<LoadingBlock rows={3} />}>
          <SubjectDescriptions assignmentId={assignment.teachingAssignmentId} />
        </Suspense>
      </section>
    </div>
  );
}

export default function AssessmentsPage(props: PageProps<"/teacher/assessments">) {
  return <><PageHeader title="Penilaian" description="Daftar penilaian untuk kelas dan mata pelajaran yang Anda ajar." /><Suspense fallback={<LoadingBlock rows={5} />}><Content {...props} /></Suspense></>;
}
