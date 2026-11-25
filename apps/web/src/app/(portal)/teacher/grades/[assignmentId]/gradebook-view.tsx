"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GRADE_STATE_LABELS, type Gradebook, type GradeCell } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { ChangeHistory, GradePanel } from "./grade-panel";

const SHORT: Record<GradeCell["state"], string> = { PENDING: "—", SCORED: "", MISSING: "TM", EXCUSED: "TB" };

function Cell({ c }: { c: GradeCell | undefined }) {
  if (!c || c.state === "PENDING") return <span className="text-muted-foreground" title={GRADE_STATE_LABELS.PENDING}>—</span>;
  if (c.state === "SCORED") return <span className="tabular-nums">{c.score}</span>;
  return (
    <span className="text-xs font-medium" title={GRADE_STATE_LABELS[c.state]}>
      {SHORT[c.state]}
    </span>
  );
}

/**
 * Buku nilai: siswa × penilaian, nilai akhir dari penilaian terbit. Panel isi nilai dibuka lewat ?isi=<id>
 * (bisa dibagikan, Back menutupnya).
 */
export function GradebookView({ gb }: { gb: Gradebook }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const editing = gb.assessments.find((a) => a.id === params.get("isi"));
  const openPanel = (id: string | null) => {
    const q = new URLSearchParams(params);
    if (id) q.set("isi", id);
    else q.delete("isi");
    router.push(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      {editing && gb.canEdit && (
        <GradePanel
          key={editing.id}
          assessment={editing}
          students={gb.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, nis: r.nis, cell: r.cells[editing.id] }))}
          onClose={() => openPanel(null)}
        />
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Buku nilai {gb.assignment.subject.name} {gb.assignment.classGroup.code}</caption>
          <thead>
            <tr className="border-b align-bottom">
              <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">
                Siswa
              </th>
              {gb.assessments.map((a) => (
                <th key={a.id} scope="col" className="min-w-28 px-2 py-2 text-left text-xs font-medium">
                  <span className="block font-mono text-[11px] text-muted-foreground">{a.component.code}</span>
                  <span className="block">{a.title}</span>
                  <span className={`mt-0.5 inline-block rounded px-1 text-[11px] ${a.status === "PUBLISHED" ? "bg-secondary" : "border border-dashed text-muted-foreground"}`}>{a.status === "PUBLISHED" ? "Terbit" : "Draf"}</span>
                  {a.assessedOn && <span className="block text-[11px] font-normal text-muted-foreground">{formatDate(a.assessedOn)}</span>}
                </th>
              ))}
              <th scope="col" className="min-w-32 px-3 py-2 text-left font-medium">
                Nilai akhir
                <span className="block text-[11px] font-normal text-muted-foreground">dari penilaian terbit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {gb.rows.map((r) => (
              <tr key={r.studentId} className="border-b last:border-0">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal">
                  <span className="font-medium">{r.fullName}</span>
                  <span className="block text-xs text-muted-foreground">{r.nis}</span>
                </th>
                {gb.assessments.map((a) => (
                  <td key={a.id} className="px-2 py-2">
                    <Cell c={r.cells[a.id]} />
                  </td>
                ))}
                <td className="px-3 py-2">
                  {r.final.complete ? (
                    <span className={`font-semibold tabular-nums ${r.final.belowPassing ? "text-primary" : ""}`}>
                      {r.final.rounded}
                      {r.final.belowPassing && <span className="ml-1 text-xs font-normal">di bawah KKTP</span>}
                    </span>
                  ) : (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Belum lengkap</summary>
                      <ul className="mt-1 list-disc pl-4">
                        {r.final.issues.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {gb.canEdit && gb.assessments.length > 0 && (
            <tfoot>
              <tr className="border-t align-top">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Aksi
                </th>
                {gb.assessments.map((a) => (
                  <td key={a.id} className="px-2 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <Button type="button" variant={editing?.id === a.id ? "default" : "outline"} size="xs" onClick={() => openPanel(a.id)}>
                        Isi nilai
                      </Button>
                      {a.status === "DRAFT" && (
                        <>
                          <ActionButton path={`/assessments/${a.id}/publish`} label="Terbitkan" size="xs" variant="ghost" confirm={a.counts.PENDING ? `${a.counts.PENDING} siswa belum dinilai. Tetap terbitkan? Nilai kosong tidak dihitung nol.` : "Terbitkan nilai ini ke siswa dan wali?"} />
                          {!a.activityId && <ActionButton method="DELETE" path={`/assessments/${a.id}`} label="Hapus" size="xs" variant="ghost" confirm={`Hapus penilaian "${a.title}"?`} />}
                        </>
                      )}
                      {a.status === "PUBLISHED" && <ChangeHistory assessmentId={a.id} />}
                    </div>
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        — belum dinilai · TM tidak mengumpulkan (dihitung 0) · TB tidak berlaku (tidak dihitung). Nilai akhir dibulatkan sekali ke bilangan bulat; nilai kosong tidak dianggap nol.
      </p>
    </div>
  );
}
