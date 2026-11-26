"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulkGradeSaveSchema, type AssessmentGradeRow } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

type Change = Pick<AssessmentGradeRow, "studentId" | "fullName" | "versionNo" | "feedback"> & { score: number; state: "SCORED" };

export function BulkGradeEditor({ assessmentId, students }: { assessmentId: string; students: AssessmentGradeRow[] }) {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function preview() {
    const byNis = new Map(students.map((student) => [student.nis, student]));
    const next: Change[] = [];
    const issues: string[] = [];
    const seen = new Set<string>();
    source.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return;
      const [nis, raw, extra] = line.trim().split(/\t+| +/);
      const student = nis ? byNis.get(nis) : undefined;
      if (!student) { issues.push(`Baris ${index + 1}: NIS tidak ditemukan.`); return; }
      if (seen.has(student.studentId)) { issues.push(`Baris ${index + 1}: NIS muncul lebih dari sekali.`); return; }
      seen.add(student.studentId);
      if (extra || !raw || !/^\d{1,3}(?:[.,]\d)?$/.test(raw) || Number(raw.replace(",", ".")) > 100) {
        issues.push(`Baris ${index + 1}: masukkan nilai 0–100 dengan maksimal satu desimal.`);
        return;
      }
      const score = Number(raw.replace(",", "."));
      if (student.state !== "SCORED" || student.score !== score) {
        next.push({ studentId: student.studentId, fullName: student.fullName, feedback: student.feedback, versionNo: student.versionNo, score, state: "SCORED" });
      }
    });
    if (next.length > 100) issues.push("Maksimal 100 perubahan dalam satu penyimpanan.");
    setChanges(issues.length ? [] : next);
    setErrors(issues);
    setNotice(issues.length ? "" : `${next.length} nilai akan berubah.`);
  }

  async function save() {
    const parsed = BulkGradeSaveSchema.safeParse({ rows: changes });
    if (!parsed.success) return;
    setBusy(true);
    try {
      const result = await apiSend<{ changed: number }>("PUT", `/assessments/${assessmentId}/grades`, parsed.data);
      if (!result.ok) {
        setErrors([result.error.message, ...Object.entries(result.error.fieldErrors ?? {}).map(([field, messages]) => `${field}: ${messages.join(" ")}`)]);
        setChanges([]);
        setNotice("");
        router.refresh();
        return;
      }
      setSource("");
      setChanges([]);
      setNotice(`${result.data.changed} nilai disimpan.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <details className="rounded-lg border bg-card p-4">
    <summary className="cursor-pointer font-semibold">Isi nilai massal</summary>
    <div className="mt-3 grid gap-3 text-sm">
      <label className="grid gap-1">
        Tempel dua kolom, NIS dan nilai, tanpa judul kolom.
        <textarea rows={5} value={source} disabled={busy} className="rounded-md border bg-background p-2 font-mono"
          onChange={(event) => { setSource(event.target.value); setChanges([]); setErrors([]); setNotice(""); }} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!source.trim() || busy} onClick={preview}>Periksa isian</Button>
        <Button type="button" size="sm" disabled={!changes.length || busy} onClick={() => void save()}>{busy ? "Menyimpan…" : "Simpan perubahan"}</Button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-destructive">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      {changes.length > 0 && <ul aria-label="Pratinjau perubahan" className="max-h-56 divide-y overflow-auto rounded-md border">
        {changes.map((row) => <li key={row.studentId} className="flex justify-between gap-2 px-3 py-2"><span>{row.fullName}</span><span>{row.score}</span></li>)}
      </ul>}
    </div>
  </details>;
}
