"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GRADE_STATE_LABELS, PublishedGradeCorrectionSchema, type AssessmentGradeRow, type GradeState, type PublishedGradeChange } from "@smart-school/contracts";
import { FormErrorSummary, useApiForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { apiGetClient, apiSend } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

export function PublishedGradeRow({ assessmentId, row }: { assessmentId: string; row: AssessmentGradeRow }) {
  const router = useRouter();
  const form = useApiForm();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<GradeState>(row.state);
  const [score, setScore] = useState(row.score === null ? "" : String(row.score));
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<PublishedGradeChange[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const path = `/assessments/${assessmentId}/grades/${row.studentId}`;
  async function loadHistory() {
    const result = await apiGetClient<PublishedGradeChange[]>(`${path}/changes`);
    if (result.ok) { setHistory(result.data); setHistoryError(null); }
    else setHistoryError(result.error.message);
  }
  return <div className="border-b p-4 text-sm last:border-b-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-medium">{row.fullName}</p><p className="text-xs text-muted-foreground">NIS {row.nis}</p></div>
      <div className="text-right"><p>{GRADE_STATE_LABELS[row.state]}{row.state === "SCORED" ? ` · ${row.score}` : row.state === "MISSING" ? " · dihitung 0" : ""}</p>{row.feedback && <p className="mt-1 text-muted-foreground">{row.feedback}</p>}</div>
    </div>
    <Button type="button" variant="ghost" size="sm" className="mt-2" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) void loadHistory(); }}>{open ? "Tutup koreksi" : "Koreksi / riwayat"}</Button>
    {open && <div className="mt-3 grid gap-4 border-t pt-4 lg:grid-cols-2">
      <form className="grid gap-3" onSubmit={async (event) => {
        event.preventDefault();
        const values = { state, score: state === "SCORED" && score.trim() !== "" ? Number(score) : null, feedback: feedback.trim() || null, versionNo: row.versionNo, reason };
        const result = await form.run({ schema: PublishedGradeCorrectionSchema, values, send: (data) => apiSend("PUT", `${path}/correction`, data) });
        if (result === null) return;
        setReason("");
        await loadHistory();
        router.refresh();
      }}>
        <p className="font-medium">Koreksi nilai terbit</p>
        <label className="grid gap-1">Keadaan<select value={state} onChange={(e) => setState(e.target.value as GradeState)} className="h-10 rounded-md border bg-background px-2"><option value="SCORED">Dinilai</option><option value="MISSING">Tidak mengumpulkan</option><option value="EXCUSED">Tidak berlaku</option></select></label>
        <label className="grid gap-1">Nilai<input type="number" min="0" max="100" step="0.1" value={score} disabled={state !== "SCORED"} onChange={(e) => setScore(e.target.value)} className="h-10 rounded-md border bg-background px-2 disabled:opacity-50" /></label>
        <label className="grid gap-1">Umpan balik<input type="text" maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="h-10 rounded-md border bg-background px-2" /></label>
        <label className="grid gap-1">Alasan koreksi<textarea minLength={10} maxLength={500} required value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20 rounded-md border bg-background p-2" /></label>
        {form.error && <><FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />{form.error.code === "CONFLICT" && <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>Muat ulang nilai</Button>}</>}
        <Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan koreksi"}</Button>
      </form>
      <section aria-label={`Riwayat koreksi ${row.fullName}`}><h3 className="font-medium">Riwayat koreksi</h3>{historyError && <p role="alert" className="mt-2 text-destructive">{historyError}</p>}{history === null && !historyError && <p className="mt-2 text-muted-foreground">Memuat riwayat…</p>}{history?.length === 0 && <p className="mt-2 text-muted-foreground">Belum ada koreksi.</p>}{history?.map((change) => <div key={change.id} className="mt-2 rounded-md border p-3"><p className="text-xs text-muted-foreground">{formatDateTime(change.createdAt)} · {change.actorName}</p><p className="mt-1">{GRADE_STATE_LABELS[change.oldState]} {change.oldScore ?? "—"} → {GRADE_STATE_LABELS[change.newState]} {change.newScore ?? "—"}</p><p className="mt-1 text-muted-foreground">{change.reason}</p></div>)}</section>
    </div>}
  </div>;
}
