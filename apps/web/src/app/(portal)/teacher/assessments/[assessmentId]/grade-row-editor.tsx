"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GRADE_STATE_LABELS, GradeEntrySaveSchema, type AssessmentGradeRow, type GradeState } from "@smart-school/contracts";
import { FormErrorSummary, useApiForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

/** Satu siswa disimpan sendiri-sendiri agar konflik versi tidak menimpa nilai siswa lain. */
export function GradeRowEditor({ assessmentId, row }: { assessmentId: string; row: AssessmentGradeRow }) {
  const router = useRouter();
  const form = useApiForm();
  const [state, setState] = useState<GradeState>(row.state);
  const [score, setScore] = useState(row.score === null ? "" : String(row.score));
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [saved, setSaved] = useState(false);
  const prefix = `grade-${row.studentId}`;

  return (
    <form
      className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[minmax(150px,1.1fr)_minmax(170px,1fr)_110px_minmax(160px,1.1fr)_auto] lg:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        const values = {
          state,
          score: state === "SCORED" && score.trim() !== "" ? Number(score) : null,
          feedback: feedback.trim() || null,
          versionNo: row.versionNo,
        };
        const result = await form.run({
          schema: GradeEntrySaveSchema,
          values,
          send: (data) => apiSend("PUT", `/assessments/${assessmentId}/grades/${row.studentId}`, data),
        });
        if (result === null) return;
        setSaved(true);
        router.refresh();
      }}
    >
      <div className="lg:self-center"><p className="text-sm font-medium">{row.fullName}</p><p className="text-xs text-muted-foreground">NIS {row.nis}</p></div>
      <div className="flex flex-col gap-1"><label htmlFor={`${prefix}-state`} className="text-xs text-muted-foreground">Keadaan</label><select id={`${prefix}-state`} value={state} onChange={(e) => setState(e.target.value as GradeState)} className="h-10 rounded-md border bg-background px-2 text-sm">{Object.entries(GRADE_STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label htmlFor={`${prefix}-score`} className="text-xs text-muted-foreground">Nilai</label><input id={`${prefix}-score`} type="number" min="0" max="100" step="0.1" inputMode="decimal" value={score} disabled={state !== "SCORED"} onChange={(e) => setScore(e.target.value)} aria-invalid={!!form.fieldErrors.score} aria-describedby={form.fieldErrors.score ? `${prefix}-score-error` : undefined} className="h-10 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"/>{form.fieldErrors.score && <span id={`${prefix}-score-error`} className="text-xs text-destructive">{form.fieldErrors.score.join(" ")}</span>}</div>
      <div className="flex flex-col gap-1"><label htmlFor={`${prefix}-feedback`} className="text-xs text-muted-foreground">Umpan balik</label><input id={`${prefix}-feedback`} type="text" maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="h-10 w-full rounded-md border bg-background px-2 text-sm" /></div>
      <div className="flex flex-col gap-1"><Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan"}</Button>{saved && <span role="status" className="text-xs text-muted-foreground">Tersimpan</span>}</div>
      {form.error && <div className="lg:col-span-5"><FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />{form.error.code === "CONFLICT" && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => router.refresh()}>Muat ulang nilai</Button>}</div>}
    </form>
  );
}
