"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReportDescriptions } from "@smart-school/contracts";
import { ReportCardStatusBadge } from "@/components/report-cards/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiSend } from "@/lib/api-client";

type Row = ReportDescriptions["rows"][number];
type Draft = { highestAchievement: string; needsImprovement: string };
type Field = keyof Draft;

const FIELD_LABELS: Record<Field, string> = { highestAchievement: "Capaian tertinggi", needsImprovement: "Perlu ditingkatkan" };

/**
 * Deskripsi capaian rapor per siswa untuk satu mapel (FR-15.3). Teks boleh diketik bebas atau diambil dari
 * capaian pembelajaran. Hanya baris yang berubah yang dikirim; rapor yang sudah diajukan/terbit terkunci.
 */
export function DescriptionEditor({ data }: { data: ReportDescriptions }) {
  const router = useRouter();
  const initial = (r: Row): Draft => ({ highestAchievement: r.highestAchievement ?? "", needsImprovement: r.needsImprovement ?? "" });
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(data.rows.map((r) => [r.studentId, initial(r)])));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = data.rows.filter((r) => {
    const d = drafts[r.studentId]!;
    return !r.locked && (d.highestAchievement !== (r.highestAchievement ?? "") || d.needsImprovement !== (r.needsImprovement ?? ""));
  });
  const set = (sid: string, f: Field, v: string) => setDrafts((all) => ({ ...all, [sid]: { ...all[sid]!, [f]: v } }));
  const editable = data.canEdit;
  const empty = data.rows.filter((r) => !r.highestAchievement || !r.needsImprovement).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border bg-background/95 p-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {data.rows.length} siswa · {empty ? `${empty} belum lengkap` : "semua terisi"}
          {changed.length > 0 && <span className="font-medium text-foreground"> · {changed.length} perubahan belum disimpan</span>}
        </p>
        {editable && (
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={!changed.length || pending}
            onClick={() =>
              start(async () => {
                setMsg(null);
                const res = await apiSend("PUT", "/report-cards/descriptions", {
                  teachingAssignmentId: data.assignment.id,
                  entries: changed.map((r) => ({ studentId: r.studentId, ...drafts[r.studentId]! })),
                });
                if (!res.ok) return setMsg({ ok: false, text: res.error.message });
                setMsg({ ok: true, text: "Deskripsi tersimpan." });
                router.refresh();
              })
            }
          >
            {pending ? "Menyimpan…" : `Simpan${changed.length ? ` (${changed.length})` : ""}`}
          </Button>
        )}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`w-full text-sm ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>
            {msg.text}
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {data.rows.map((r) => {
          const d = drafts[r.studentId]!;
          const disabled = !editable || r.locked;
          return (
            <li key={r.studentId} className="flex flex-col gap-3 rounded-2xl border bg-card p-3 lg:flex-row">
              <div className="flex min-w-52 flex-col gap-1">
                <span className="font-medium">{r.fullName}</span>
                <span className="text-xs text-muted-foreground">{r.nis}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {r.finalScore === null ? <span className="text-xs text-muted-foreground">Nilai akhir belum lengkap</span> : <span className={`font-semibold tabular-nums ${r.belowPassing ? "text-primary" : ""}`}>Nilai akhir {r.finalScore}</span>}
                  <ReportCardStatusBadge status={r.status} />
                </span>
                {r.locked && <span className="text-xs text-muted-foreground">Terkunci: rapor sudah diajukan atau terbit.</span>}
              </div>
              <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                {(Object.keys(FIELD_LABELS) as Field[]).map((f) => {
                  const id = `${r.studentId}-${f}`;
                  return (
                    <div key={f} className="flex min-w-0 flex-col gap-1 text-sm">
                      <label htmlFor={id} className="font-medium">
                        {FIELD_LABELS[f]}
                      </label>
                      <Textarea id={id} value={d[f]} onChange={(e) => set(r.studentId, f, e.target.value)} disabled={disabled} maxLength={500} rows={3} />
                      {!disabled && data.outcomes.length > 0 && (
                        <select
                          aria-label={`Ambil dari capaian pembelajaran untuk ${FIELD_LABELS[f].toLowerCase()} ${r.fullName}`}
                          className="w-full min-w-0 truncate rounded-md border bg-background px-1.5 py-1 text-xs text-muted-foreground"
                          value=""
                          onChange={(e) => {
                            const o = data.outcomes.find((x) => x.id === e.target.value);
                            if (o) set(r.studentId, f, d[f] ? `${d[f]} ${o.description}` : o.description);
                          }}
                        >
                          <option value="">+ Tambah dari capaian pembelajaran…</option>
                          {data.outcomes.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.code} · {o.description.slice(0, 70)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
