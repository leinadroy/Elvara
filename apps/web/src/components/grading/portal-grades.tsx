import { GRADE_STATE_LABELS, type PortalGradesView } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDate } from "@/lib/format";

export async function PortalGrades({ studentId }: { studentId?: string }) {
  const result = await apiGet<PortalGradesView>(`/me/grades${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.items.length) return <EmptyState title="Belum ada nilai terbit" description="Nilai tampil setelah guru menerbitkan penilaian untuk siswa ini." />;
  return (
    <div className="grid gap-3">
      {result.data.summaries.length > 0 && (
        <section aria-labelledby="portal-grade-summary" className="rounded-lg border bg-card p-4">
          <h2 id="portal-grade-summary" className="font-semibold">Nilai akhir berjalan</h2>
          <ul className="mt-2 divide-y">
            {result.data.summaries.map((summary) => (
              <li key={summary.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">{summary.subject}</p>
                  <p className="text-xs text-muted-foreground">{summary.classCode} · {summary.academicYear} · {summary.term} · Skema versi {summary.versionNo}</p>
                </div>
                <p>{summary.status === "INCOMPLETE" ? "Belum lengkap" : summary.status === "EXCUSED" ? "Tidak berlaku" : summary.finalScore}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.data.items.map((item) => (
        <article key={item.assessmentId} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">{item.subject} · {item.classCode} · {item.component}</p><h2 className="mt-1 font-semibold">{item.title}</h2><p className="mt-1 text-xs text-muted-foreground">Dinilai {formatDate(item.assessedOn)}</p></div>
            <div className="text-right"><p className="text-xl font-semibold tabular-nums">{item.state === "SCORED" ? item.score : item.state === "MISSING" ? "0" : "—"}</p><p className="text-xs text-muted-foreground">{GRADE_STATE_LABELS[item.state]}</p></div>
          </div>
          {item.feedback && <p className="mt-3 border-t pt-3 text-sm">{item.feedback}</p>}
        </article>
      ))}
    </div>
  );
}
