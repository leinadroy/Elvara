import { Suspense } from "react";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { ReviewActions } from "./review-actions";

type Review = {
  classGroup: { code: string };
  term: { name: string };
  currentVersionNo: number;
  students: {
    fullName: string; nis: string; ready: boolean; homeroomNote: string | null;
    attendance: Record<"PRESENT" | "EXCUSED" | "SICK" | "ABSENT" | "LATE", number>;
    subjects: { id: string; name: string; score: number | null; highestAchievement: string | null; needsImprovement: string | null }[];
  }[];
};

async function Report({ params }: PageProps<"/academics/report-review/[reportId]">) {
  const { reportId } = await params;
  const result = await apiGet<Review>(`/report-cards/${encodeURIComponent(reportId)}/review`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  const report = result.data;
  const student = report.students[0];
  if (!student) return <EmptyState title="Siswa tidak ada dalam daftar peserta rapor" />;
  const attendance = student.attendance;
  return <div className="grid gap-4">
    <section className="rounded-lg border bg-card p-4 text-sm">
      <h2 className="text-lg font-semibold">{student.fullName}</h2>
      <p className="text-muted-foreground">NIS {student.nis} · {report.classGroup.code} · {report.term.name}</p>
      {!student.ready && <p className="mt-2 font-medium">Rapor belum lengkap.</p>}
      <p className="mt-3">Hadir {attendance.PRESENT} · Izin {attendance.EXCUSED} · Sakit {attendance.SICK} · Alpa {attendance.ABSENT} · Terlambat {attendance.LATE}</p>
      <p className="mt-2 whitespace-pre-wrap">Catatan wali kelas: {student.homeroomNote ?? "—"}</p>
    </section>
    <ul className="divide-y rounded-lg border bg-card">
      {student.subjects.map((subject) => (
        <li className="grid gap-1 p-4 text-sm" key={subject.id}>
          <h3 className="font-semibold">{subject.name} · {subject.score ?? "Nilai belum lengkap"}</h3>
          <p className="whitespace-pre-wrap">Capaian tertinggi: {subject.highestAchievement ?? "—"}</p>
          <p className="whitespace-pre-wrap">Perlu ditingkatkan: {subject.needsImprovement ?? "—"}</p>
        </li>
      ))}
    </ul>
    <ReviewActions id={reportId} revision={report.currentVersionNo > 0} ready={student.ready} />
  </div>;
}

export default function ReportReviewPage(props: PageProps<"/academics/report-review/[reportId]">) {
  return <><PageHeader title="Tinjau rapor" back={{ href: "/academics/report-review", label: "Kembali ke antrean" }} />
    <Suspense fallback={<LoadingBlock rows={4} />}><Report {...props} /></Suspense>
  </>;
}
