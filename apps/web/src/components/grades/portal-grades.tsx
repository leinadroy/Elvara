import { GRADE_STATE_LABELS, type PortalGrades, type PortalSubjectGrades } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDate } from "@/lib/format";

function Final({ s }: { s: PortalSubjectGrades }) {
  const f = s.final;
  if (f.complete)
    return (
      <div className="flex flex-col items-end">
        <span className={`text-3xl font-bold tabular-nums ${f.belowPassing ? "text-primary" : ""}`}>{f.rounded}</span>
        {f.belowPassing && <span className="text-xs font-medium text-primary">Di bawah KKTP {s.scheme?.passingScore}</span>}
      </div>
    );
  return <span className="shrink-0 rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground">Nilai akhir belum lengkap</span>;
}

function Subject({ s }: { s: PortalSubjectGrades }) {
  return (
    <section aria-label={s.subject.name} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{s.subject.name}</h2>
          <p className="text-xs text-muted-foreground">{s.teacher}</p>
        </div>
        <Final s={s} />
      </div>
      {s.scheme && (
        <dl className="flex flex-wrap gap-2 text-xs">
          {s.scheme.components.map((c) => (
            <div key={c.code} className="rounded-md bg-muted px-2 py-1">
              <dt className="inline">
                {c.name} <span className="text-muted-foreground">({c.weight}%)</span>
              </dt>{" "}
              <dd className="inline font-semibold tabular-nums">{s.final.components[c.code] ?? "—"}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.assessments.length ? (
        <ul className="flex flex-col divide-y text-sm">
          {s.assessments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{a.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {a.component.name}
                  {a.assessedOn && ` · ${formatDate(a.assessedOn)}`}
                </span>
                {a.cell?.feedback && <span className="block text-xs">Umpan balik: {a.cell.feedback}</span>}
              </span>
              <span className="font-semibold tabular-nums">{!a.cell ? <span className="text-xs font-normal text-muted-foreground">Belum dinilai</span> : a.cell.state === "SCORED" ? a.cell.score : <span className="text-xs">{GRADE_STATE_LABELS[a.cell.state]}</span>}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada nilai yang terbit.</p>
      )}
      {!s.final.complete && s.assessments.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Kenapa belum lengkap?</summary>
          <ul className="mt-1 list-disc pl-4">
            {s.final.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** Nilai terbit siswa (atau anak bagi wali) per mapel pada semester berjalan. */
export async function PortalGradesView({ studentId }: { studentId?: string }) {
  const res = await apiGet<PortalGrades>(`/me/grades${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const g = res.data;
  if (!g.term) return <EmptyState title="Di luar masa semester" />;
  if (!g.classGroup) return <EmptyState title="Belum ditempatkan di rombel" />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {g.term.name} · Rombel {g.classGroup.code}. Hanya nilai yang sudah diterbitkan guru yang tampil; nilai akhir dibulatkan sekali dan nilai kosong tidak dianggap nol.
      </p>
      {g.subjects.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {g.subjects.map((s) => (
            <Subject key={s.teachingAssignmentId} s={s} />
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada mata pelajaran" />
      )}
    </div>
  );
}
