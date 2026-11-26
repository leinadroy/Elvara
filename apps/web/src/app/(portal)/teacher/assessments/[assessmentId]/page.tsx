import type { Metadata } from "next";
import { Suspense } from "react";
import type { AssessmentGradeSheet } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { GradeRowEditor } from "./grade-row-editor";
import { PublishedGradeRow } from "./published-grade-row";
import { BulkGradeEditor } from "./bulk-grade-editor";

export const metadata: Metadata = { title: "Lembar nilai" };

async function Content({ params }: PageProps<"/teacher/assessments/[assessmentId]">) {
  const { assessmentId } = await params;
  const result = await apiGet<AssessmentGradeSheet>(`/assessments/${assessmentId}/grades`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  const { assessment, rosterDate, students } = result.data;
  const pending = students.filter((row) => row.state === "PENDING").length;
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{assessment.title}</h2><p className="mt-1 text-sm text-muted-foreground">{assessment.component.name} · {assessment.assessedOn ? formatDate(assessment.assessedOn) : "Tanggal belum ditentukan"}</p></div><span className="rounded-md border px-2 py-1 text-xs">{assessment.status === "DRAFT" ? "Draf" : "Terbit"}</span></div>
        <p className="mt-3 text-sm text-muted-foreground">Daftar siswa pada {formatDate(rosterDate)}. {assessment.status === "DRAFT" ? "Nilai draf belum terlihat oleh siswa dan wali." : "Perubahan nilai terbit memerlukan alasan dan tercatat dalam riwayat koreksi."}</p>
      </section>
      {students.length ? (
        <>
          {assessment.status === "DRAFT" && <BulkGradeEditor assessmentId={assessment.id} students={students} />}
          <section aria-label="Nilai per siswa" className="overflow-hidden rounded-lg border bg-card">
            {assessment.status === "DRAFT" ? students.map((row) => <GradeRowEditor key={`${row.studentId}:${row.versionNo}`} assessmentId={assessment.id} row={row} />) : students.map((row) => <PublishedGradeRow key={`${row.studentId}:${row.versionNo}`} assessmentId={assessment.id} row={row} />)}
          </section>
          {assessment.status === "DRAFT" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"><p className="text-sm">{pending ? `${pending} siswa belum dinilai sebelum penilaian dapat diterbitkan.` : "Semua siswa sudah memiliki keadaan nilai."}</p>{pending === 0 && <ActionButton path={`/assessments/${assessment.id}/publish`} label="Terbitkan penilaian" confirm="Terbitkan penilaian ini? Setelah terbit, nilai tidak dapat diubah dari lembar draf." />}</div>}
        </>
      ) : <EmptyState title="Tidak ada siswa pada tanggal penilaian" description="Periksa penempatan siswa dan tanggal penilaian sebelum mengisi nilai." />}
    </div>
  );
}

export default function AssessmentGradesPage(props: PageProps<"/teacher/assessments/[assessmentId]">) {
  return <><PageHeader title="Lembar nilai" back={{ href: "/teacher/assessments", label: "Kembali ke penilaian" }} /><Suspense fallback={<LoadingBlock rows={6} />}><Content {...props} /></Suspense></>;
}
