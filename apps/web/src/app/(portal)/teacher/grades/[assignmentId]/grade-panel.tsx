"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AssessmentSchema, GRADE_STATE_LABELS, GRADE_STATES, type AssessmentView, type GradeCell, type GradeState } from "@smart-school/contracts";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";
import { apiGetClient, apiSend } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

type Student = { studentId: string; fullName: string; nis: string; cell: GradeCell | undefined };
type Draft = Record<string, { state: GradeState; score: string; feedback: string }>;

const fromCell = (c: GradeCell | undefined) => ({ state: c?.state ?? "PENDING", score: c?.score != null ? String(c.score) : "", feedback: c?.feedback ?? "" });

/**
 * Isi nilai satu penilaian untuk semua siswa. Hanya baris yang berubah yang dikirim, beserta versi yang dilihat
 * (pemeriksaan versi di server). Untuk penilaian terbit, alasan perubahan wajib dan perubahan tercatat.
 */
export function GradePanel({ assessment, students, onClose }: { assessment: AssessmentView; students: Student[]; onClose: () => void }) {
  const router = useRouter();
  const initial = useMemo<Draft>(() => Object.fromEntries(students.map((s) => [s.studentId, fromCell(s.cell)])), [students]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const published = assessment.status === "PUBLISHED";

  const changed = students.filter((s) => {
    const a = draft[s.studentId]!;
    const b = initial[s.studentId]!;
    return a.state !== b.state || a.score !== b.score || a.feedback !== b.feedback;
  });

  useEffect(() => {
    if (!changed.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed.length]);

  const set = (id: string, patch: Partial<Draft[string]>) => {
    setSaved(null);
    setDraft((d) => ({ ...d, [id]: { ...d[id]!, ...patch } }));
  };

  function save() {
    setError(null);
    const entries = changed.map((s) => {
      const d = draft[s.studentId]!;
      return { studentId: s.studentId, state: d.state, score: d.state === "SCORED" ? Number(d.score.replace(",", ".")) : null, feedback: d.feedback.trim() || null, versionNo: s.cell?.versionNo ?? null };
    });
    const bad = entries.find((e) => e.state === "SCORED" && (!Number.isFinite(e.score) || e.score! < 0 || e.score! > 100));
    if (bad) return setError(`Nilai ${students.find((s) => s.studentId === bad.studentId)!.fullName} harus 0–100.`);
    start(async () => {
      const res = await apiSend<{ changed: number }>("PUT", `/assessments/${assessment.id}/grades`, { entries, reason: published ? reason : undefined });
      if (!res.ok) {
        const names = res.error.fieldErrors?.entries;
        return setError(names?.length && res.status === 409 ? `${res.error.message} (${names.join(", ")})` : (res.error.fieldErrors?.reason?.[0] ?? res.error.message));
      }
      setSaved(`${res.data.changed} nilai tersimpan.`);
      setReason("");
      router.refresh();
    });
  }

  return (
    <section aria-label={`Isi nilai ${assessment.title}`} className="flex flex-col gap-3 rounded-2xl border border-primary bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          Isi nilai: {assessment.title} <span className="text-sm font-normal text-muted-foreground">({assessment.component.name})</span>
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => (!changed.length || window.confirm("Ada perubahan yang belum disimpan. Tutup?")) && onClose()}>
          Tutup
        </Button>
      </div>
      {published && <p className="text-sm text-muted-foreground">Penilaian ini sudah terbit dan terlihat oleh siswa dan wali. Perubahan nilai wajib disertai alasan dan tercatat di riwayat.</p>}
      <div className="flex flex-wrap gap-1 text-xs">
        <span className="text-muted-foreground">Isi cepat untuk yang belum dinilai:</span>
        {(["MISSING", "EXCUSED"] as const).map((st) => (
          <Button key={st} type="button" variant="outline" size="xs" onClick={() => setDraft((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.state === "PENDING" ? { ...v, state: st, score: "" } : v])))}>
            {GRADE_STATE_LABELS[st]}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">Siswa</th>
              <th className="w-48 py-1 font-medium">Keadaan</th>
              <th className="w-24 py-1 font-medium">Nilai</th>
              <th className="py-1 font-medium">Umpan balik</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const d = draft[s.studentId]!;
              const dirty = changed.includes(s);
              return (
                <tr key={s.studentId} className={dirty ? "bg-accent" : ""}>
                  <td className="py-1 pr-2">
                    <span className="font-medium">{s.fullName}</span> <span className="text-xs text-muted-foreground">{s.nis}</span>
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      aria-label={`Keadaan nilai ${s.fullName}`}
                      value={d.state}
                      onChange={(e) => set(s.studentId, { state: e.target.value as GradeState, score: e.target.value === "SCORED" ? d.score : "" })}
                      className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
                    >
                      {GRADE_STATES.map((st) => (
                        <option key={st} value={st}>
                          {GRADE_STATE_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Nilai ${s.fullName}`}
                      inputMode="decimal"
                      value={d.score}
                      disabled={d.state === "MISSING" || d.state === "EXCUSED"}
                      placeholder={d.state === "MISSING" || d.state === "EXCUSED" ? "—" : "0–100"}
                      // Mengetik angka langsung menjadikan keadaan "Dinilai"; mengosongkan kembali ke "Belum dinilai".
                      onChange={(e) => set(s.studentId, { score: e.target.value, state: e.target.value.trim() ? "SCORED" : "PENDING" })}
                      className="h-9 w-full rounded-lg border bg-background px-2 text-right text-sm tabular-nums disabled:opacity-50"
                    />
                  </td>
                  <td className="py-1">
                    <input aria-label={`Umpan balik ${s.fullName}`} value={d.feedback} maxLength={500} onChange={(e) => set(s.studentId, { feedback: e.target.value })} className="h-9 w-full rounded-lg border bg-background px-2 text-sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {published && changed.length > 0 && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Alasan perubahan nilai terbit
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="mis. salah input dari lembar jawaban" className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground" />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending || !changed.length || (published && reason.trim().length < 5 && changed.length > 0)} onClick={save}>
          {pending ? "Menyimpan…" : `Simpan ${changed.length || ""} perubahan`}
        </Button>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {saved}
        </span>
      </div>
    </section>
  );
}

type Opt = { value: string; label: string };

export function NewAssessmentForm({ teachingAssignmentId, components }: { teachingAssignmentId: string; components: Opt[] }) {
  return (
    <InlineForm
      path="/assessments"
      schema={AssessmentSchema}
      submitLabel="Tambah penilaian"
      transform={(v) => ({ ...v, teachingAssignmentId })}
      className="grid gap-3 sm:grid-cols-3"
      fields={(e) => (
        <>
          <SelectField name="componentId" label="Komponen" required placeholder="Pilih…" options={components} errors={e} />
          <TextField name="title" label="Judul" required errors={e} placeholder="mis. Kuis bab 2" />
          <TextField name="assessedOn" label="Tanggal" type="date" errors={e} />
        </>
      )}
    />
  );
}

type Change = { id: string; student: string; oldState: GradeState; oldScore: number | null; newState: GradeState; newScore: number | null; reason: string; actor: string | null; createdAt: string };
const show = (state: GradeState, score: number | null) => (state === "SCORED" ? String(score) : GRADE_STATE_LABELS[state]);

/** Riwayat perubahan nilai terbit (dimuat saat dibuka). */
export function ChangeHistory({ assessmentId }: { assessmentId: string }) {
  const [rows, setRows] = useState<Change[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || rows) return;
    void apiGetClient<Change[]>(`/assessments/${assessmentId}/changes`).then((r) => setRows(r.ok ? r.data : []));
  }, [open, rows, assessmentId]);
  return (
    <details className="text-xs" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-muted-foreground">Riwayat perubahan</summary>
      {rows === null ? (
        <p className="py-1 text-muted-foreground">Memuat…</p>
      ) : rows.length ? (
        <ul className="mt-1 flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.id}>
              {r.student}: {show(r.oldState, r.oldScore)} → {show(r.newState, r.newScore)} · {r.reason} · {r.actor ?? "—"} · {formatDateTime(r.createdAt)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-muted-foreground">Belum ada perubahan setelah terbit.</p>
      )}
    </details>
  );
}
