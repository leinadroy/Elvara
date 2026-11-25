import { ATTENDANCE_STATUS_LABELS, REPORT_CARD_STATUS_LABELS, type ReportCardContent, type ReportCardStatus, type ReportCardVersionView } from "@smart-school/contracts";
import { formatDateTime } from "@/lib/format";

/** Status rapor sebagai teks + warna (blueprint). */
export function ReportCardStatusBadge({ status }: { status: ReportCardStatus }) {
  const cls =
    status === "PUBLISHED"
      ? "bg-secondary text-secondary-foreground"
      : status === "SUBMITTED"
        ? "border border-[var(--module)] text-foreground"
        : status === "RETURNED"
          ? "border border-primary text-primary"
          : "border border-dashed text-muted-foreground";
  return <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{REPORT_CARD_STATUS_LABELS[status]}</span>;
}

/** Isi rapor (pratinjau langsung atau snapshot versi terbit). */
export function ReportCardContentView({ c }: { c: ReportCardContent }) {
  return (
    <article aria-label="Isi rapor" className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <header className="flex flex-col gap-1 border-b pb-3">
        <p className="text-xs text-muted-foreground">{c.school.name}</p>
        <h2 className="text-lg font-semibold">{c.student.fullName}</h2>
        <p className="text-sm text-muted-foreground">
          NIS {c.student.nis ?? "—"}
          {c.student.nisn && ` · NISN ${c.student.nisn}`} · Rombel {c.classGroup.code} · {c.term.name} {c.term.academicYear}
          {c.homeroomTeacher && ` · Wali kelas ${c.homeroomTeacher}`}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Mata pelajaran</th>
              <th className="w-20 py-1.5 pr-2 text-center font-medium">Nilai akhir</th>
              <th className="py-1.5 font-medium">Capaian kompetensi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {c.subjects.map((s) => (
              <tr key={s.subject.id} className="align-top">
                <td className="py-2 pr-2">
                  <span className="font-medium">{s.subject.name}</span>
                  {s.teacher && <span className="block text-xs text-muted-foreground">{s.teacher}</span>}
                </td>
                <td className="py-2 pr-2 text-center">
                  {s.finalScore === null ? (
                    <span className="text-xs text-muted-foreground">Belum lengkap</span>
                  ) : (
                    <span className={`text-lg font-semibold tabular-nums ${s.belowPassing ? "text-primary" : ""}`}>{s.finalScore}</span>
                  )}
                  {s.belowPassing && s.finalScore !== null && <span className="block text-xs text-primary">Di bawah KKTP {s.passingScore}</span>}
                </td>
                <td className="py-2 text-sm">
                  {s.highestAchievement ? <p>Menguasai: {s.highestAchievement}</p> : <p className="text-xs text-muted-foreground">Capaian tertinggi belum diisi</p>}
                  {s.needsImprovement ? <p className="mt-1">Perlu ditingkatkan: {s.needsImprovement}</p> : <p className="mt-1 text-xs text-muted-foreground">Capaian yang perlu ditingkatkan belum diisi</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!c.subjects.length && <p className="text-sm text-muted-foreground">Belum ada mata pelajaran.</p>}
      </div>
      <dl className="flex flex-wrap gap-2 text-xs">
        {(["SICK", "EXCUSED", "ABSENT", "LATE"] as const).map((k) => (
          <div key={k} className="rounded-md bg-muted px-2 py-1">
            <dt className="inline">{ATTENDANCE_STATUS_LABELS[k]}</dt> <dd className="inline font-semibold tabular-nums">{c.attendance[k]}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Catatan wali kelas">
        <h3 className="text-sm font-semibold">Catatan wali kelas</h3>
        <p className="text-sm whitespace-pre-line">{c.homeroomNote || <span className="text-muted-foreground">Belum diisi.</span>}</p>
      </section>
    </article>
  );
}

/** Daftar versi terbit dengan tautan unduh PDF (setiap unduhan tercatat). */
export function ReportCardVersions({ versions }: { versions: ReportCardVersionView[] }) {
  if (!versions.length) return null;
  return (
    <section aria-label="Versi terbit" className="flex flex-col gap-2">
      <h2 className="font-semibold">Versi terbit</h2>
      <ol className="flex flex-col gap-1.5 text-sm">
        {versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <span className="font-medium">Versi {v.versionNo}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(v.publishedAt)}
              {v.publishedBy && ` · disetujui ${v.publishedBy}`}
              {v.revisionReason && ` · revisi: ${v.revisionReason}`}
            </span>
            <a href={v.fileUrl} className="ml-auto text-sm font-medium underline">
              Unduh PDF
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
