import { Suspense } from "react";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams } from "@/lib/api-server";
import { SubmitReport } from "./submit-report";

type Option = { classGroupId: string; termId: string; label: string };
type Preview = { students: {
  studentId: string; fullName: string; nis: string; ready: boolean; status: keyof typeof statuses;
  homeroomNote: string | null; returnNote: string | null;
  attendance: Record<"PRESENT" | "EXCUSED" | "SICK" | "ABSENT" | "LATE", number>;
  subjects: { id: string; name: string; score: number | null; issues: string[]; highestAchievement: string | null; needsImprovement: string | null }[];
}[] };

const statuses = { DRAFT: "Draf", SUBMITTED: "Diajukan", RETURNED: "Dikembalikan", PUBLISHED: "Terbit" };
const issueLabels: Record<string, string> = {
  GRADE_INCOMPLETE: "Nilai belum lengkap", GRADE_AMBIGUOUS: "Ada lebih dari satu sumber nilai", DESCRIPTION_MISSING: "Deskripsi capaian belum lengkap",
};
const base = "/teacher/reports";
const optionKey = (option: Option) => `${option.classGroupId}:${option.termId}`;

async function Reports({ searchParams }: PageProps<"/teacher/reports">) {
  const query = flatParams(await searchParams);
  const options = await apiGet<Option[]>("/report-cards/homeroom-options");
  if (!options.ok) return <ApiErrorState status={options.status} error={options.error} />;
  if (!options.data.length) return <EmptyState title="Belum ada rombel binaan dengan semester berjalan" />;
  const selected = query.scope ? options.data.find((option) => optionKey(option) === query.scope) : options.data[0];
  const result = selected ? await apiGet<Preview>(`/report-cards/preview?classGroupId=${selected.classGroupId}&termId=${selected.termId}`) : null;
  return <div className="grid gap-4">
    <Picker key={selected ? optionKey(selected) : "invalid"} action={base}
      fields={[{ name: "scope", label: "Rombel dan semester", value: selected && optionKey(selected), options: options.data.map((option) => ({ value: optionKey(option), label: option.label })) }]} />
    {!result || !selected ? <EmptyState title="Pilih rombel dan semester yang tersedia" />
      : !result.ok ? <ApiErrorState status={result.status} error={result.error} />
      : !result.data.students.length ? <EmptyState title="Belum ada siswa dalam daftar rapor" />
      : result.data.students.map((student) => {
        const { PRESENT, EXCUSED, SICK, ABSENT, LATE } = student.attendance;
        return <details key={student.studentId} className="rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">{student.fullName} · {statuses[student.status]} · {student.ready ? "Lengkap" : "Belum lengkap"}</summary>
          <div className="mt-3 grid gap-3">
            <p className="text-muted-foreground">NIS {student.nis}</p>
            <p>Hadir {PRESENT} · Izin {EXCUSED} · Sakit {SICK} · Alpa {ABSENT} · Terlambat {LATE}</p>
            {student.returnNote && <p className="whitespace-pre-wrap">Catatan peninjau: {student.returnNote}</p>}
            {!student.subjects.length && <p>Belum ada mata pelajaran untuk rombel ini.</p>}
            <ul className="divide-y">
              {student.subjects.map((subject) => <li key={subject.id} className="py-2">
                <p className="font-medium">{subject.name} · {subject.score ?? "—"}</p>
                {subject.highestAchievement && <p className="whitespace-pre-wrap">Capaian tertinggi: {subject.highestAchievement}</p>}
                {subject.needsImprovement && <p className="whitespace-pre-wrap">Perlu ditingkatkan: {subject.needsImprovement}</p>}
                {subject.issues.length > 0 && <p className="text-muted-foreground">{subject.issues.map((issue) => issueLabels[issue] ?? issue).join(" · ")}</p>}
              </li>)}
            </ul>
            {student.ready && (student.status === "DRAFT" || student.status === "RETURNED")
              ? <SubmitReport classGroupId={selected.classGroupId} termId={selected.termId} studentId={student.studentId} note={student.homeroomNote} />
              : student.homeroomNote && <p className="whitespace-pre-wrap">Catatan wali kelas: {student.homeroomNote}</p>}
          </div>
        </details>;
      })}
  </div>;
}

export default function TeacherReportsPage(props: PageProps<"/teacher/reports">) {
  return <><PageHeader title="Rapor rombel" /><Suspense fallback={<LoadingBlock rows={4} />}><Reports {...props} /></Suspense></>;
}
