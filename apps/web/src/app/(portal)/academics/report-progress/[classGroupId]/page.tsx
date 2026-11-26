import type { Metadata } from "next";
import { Suspense } from "react";
import { ATTENDANCE_STATUS_LABELS } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Rapor rombel" };

const STATUS_LABELS: Record<string, string> = { DRAFT: "Draf", SUBMITTED: "Diajukan", RETURNED: "Dikembalikan", PUBLISHED: "Terbit" };
const ISSUE_LABELS: Record<string, string> = { GRADE_INCOMPLETE: "nilai akhir belum lengkap", GRADE_AMBIGUOUS: "lebih dari satu nilai akhir", DESCRIPTION_MISSING: "deskripsi belum diisi" };

type ClassView = {
  classGroup: { id: string; code: string }; term: { id: string; name: string }; rosterDate: string;
  students: {
    studentId: string; fullName: string; nis: string; status: string; homeroomNote: string | null; ready: boolean;
    attendance: Record<"PRESENT" | "EXCUSED" | "SICK" | "ABSENT" | "LATE", number>;
    subjects: { id: string; name: string; score: number | null; highestAchievement: string | null; needsImprovement: string | null; issues: string[] }[];
    versions: { id: string; versionNo: number; publishedAt: string; revisionReason: string | null }[];
  }[];
};

async function Content({ params, searchParams }: PageProps<"/academics/report-progress/[classGroupId]">) {
  const { classGroupId } = await params;
  const termId = flatParams(await searchParams).termId;
  if (!termId) return <EmptyState title="Pilih rombel dari halaman Progres rapor" />;
  const result = await apiGet<ClassView>(`/report-cards/class-view?classGroupId=${encodeURIComponent(classGroupId)}&termId=${encodeURIComponent(termId)}`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  const { classGroup, term, students } = result.data;
  return <>
    <PageHeader title={`Rapor ${classGroup.code}`} description={`${term.name} · hanya baca. Isi rapor draf mengikuti data terkini; rapor terbit dapat diunduh per versi.`} back={{ href: "/academics/report-progress", label: "Progres rapor" }} />
    {!students.length ? <EmptyState title="Belum ada siswa dalam rombel ini" /> : <div className="grid gap-2">
      {students.map((s) => {
        const issues = s.subjects.flatMap((subject) => subject.issues.map((issue) => `${subject.name}: ${ISSUE_LABELS[issue] ?? issue}`));
        return <details key={s.studentId} className="rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer">
            <span className="font-medium">{s.fullName}</span> · NIS {s.nis} · {STATUS_LABELS[s.status] ?? s.status}
            {s.status !== "PUBLISHED" && <span className="text-muted-foreground"> · {s.ready ? "siap diajukan" : `${issues.length} kekurangan`}</span>}
          </summary>
          <div className="mt-3 grid gap-3">
            {issues.length > 0 && s.status !== "PUBLISHED" && <ul className="list-disc pl-5 text-muted-foreground">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
            <div className="overflow-x-auto"><table className="w-full min-w-[520px]">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1 pr-2 font-medium">Mata pelajaran</th><th className="py-1 pr-2 font-medium">Nilai akhir</th><th className="py-1 font-medium">Capaian kompetensi</th></tr></thead>
              <tbody className="divide-y">{s.subjects.map((subject) => <tr key={subject.id} className="align-top">
                <td className="py-2 pr-2 font-medium">{subject.name}</td>
                <td className="py-2 pr-2 tabular-nums">{subject.score ?? "—"}</td>
                <td className="py-2"><p>Tertinggi: {subject.highestAchievement ?? "—"}</p><p className="mt-1">Perlu ditingkatkan: {subject.needsImprovement ?? "—"}</p></td>
              </tr>)}</tbody>
            </table></div>
            <p className="text-muted-foreground">{(["PRESENT", "EXCUSED", "SICK", "ABSENT", "LATE"] as const).map((k) => `${ATTENDANCE_STATUS_LABELS[k]} ${s.attendance[k]}`).join(" · ")}</p>
            <p>Catatan wali kelas: {s.homeroomNote || "—"}</p>
            {s.versions.length > 0 && <ul className="grid gap-1">{s.versions.map((v) => <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2">
              <span className="font-medium">Versi {v.versionNo}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(v.publishedAt)}{v.revisionReason && ` · revisi: ${v.revisionReason}`}</span>
              <a className="ml-auto text-primary underline" href={`/api/v1/report-cards/versions/${v.id}/file`}>Unduh PDF</a>
            </li>)}</ul>}
          </div>
        </details>;
      })}
    </div>}
  </>;
}

export default function ReportProgressClassPage(props: PageProps<"/academics/report-progress/[classGroupId]">) {
  return <Suspense fallback={<LoadingBlock rows={6} />}><Content {...props} /></Suspense>;
}
