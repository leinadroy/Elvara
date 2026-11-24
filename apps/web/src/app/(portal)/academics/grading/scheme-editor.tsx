"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GradeComponentInputSchema, LearningOutcomeSchema, WEIGHT_TOTAL, weightTotal, type GradeSchemeView, type LearningOutcomeView } from "@smart-school/contracts";
import { SelectField, TextAreaField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

type Row = { code: string; name: string; weight: string };
/** Templat awal Kurikulum Merdeka: formatif, sumatif tengah semester, sumatif akhir semester. */
const DEFAULT_ROWS: Row[] = [
  { code: "FORMATIF", name: "Formatif (tugas & kuis)", weight: "30" },
  { code: "STS", name: "Sumatif tengah semester", weight: "30" },
  { code: "SAS", name: "Sumatif akhir semester", weight: "40" },
];

const inputClass = "h-9 w-full rounded-lg border bg-background px-2 text-sm";

/**
 * Editor komponen skema: baris kode/nama/bobot dengan total langsung. Simpan draf kapan saja;
 * terbit hanya bila total tepat 100% (diperiksa juga di server).
 */
export function SchemeEditor({ scheme, create }: { scheme: GradeSchemeView | null; create?: { termId: string; subjectId: string; gradeLevelId: string } }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(scheme ? scheme.components.map((c) => ({ code: c.code, name: c.name, weight: String(c.weight) })) : DEFAULT_ROWS);
  const [passing, setPassing] = useState(scheme?.passingScore != null ? String(scheme.passingScore) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const total = weightTotal(rows.map((r) => ({ weight: Number(r.weight) || 0 })));
  const set = (i: number, patch: Partial<Row>) => {
    setSaved(false);
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };

  const payload = () => {
    const components = rows.map((r) => GradeComponentInputSchema.safeParse(r));
    const bad = components.findIndex((c) => !c.success);
    if (bad >= 0) {
      const issue = (components[bad] as { error: { issues: { message: string }[] } }).error.issues[0]!;
      throw new Error(`Baris ${bad + 1}: ${issue.message}`);
    }
    return { passingScore: passing.trim() === "" ? null : Number(passing), components: components.map((c) => (c as { data: unknown }).data) };
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) =>
    start(async () => {
      setError(null);
      try {
        const res = await fn();
        if (!res.ok) return setError(res.error!.message);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-32 py-1 font-medium">Kode</th>
            <th className="py-1 font-medium">Nama komponen</th>
            <th className="w-24 py-1 font-medium">Bobot (%)</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1 pr-2">
                <input aria-label={`Kode komponen ${i + 1}`} value={r.code} onChange={(e) => set(i, { code: e.target.value.toUpperCase() })} className={inputClass} />
              </td>
              <td className="py-1 pr-2">
                <input aria-label={`Nama komponen ${i + 1}`} value={r.name} onChange={(e) => set(i, { name: e.target.value })} className={inputClass} />
              </td>
              <td className="py-1 pr-2">
                <input aria-label={`Bobot komponen ${i + 1}`} inputMode="decimal" value={r.weight} onChange={(e) => set(i, { weight: e.target.value })} className={`${inputClass} text-right tabular-nums`} />
              </td>
              <td>
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus komponen ${i + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="py-1 text-right text-xs text-muted-foreground">
              Jumlah bobot
            </td>
            <td className={`py-1 pr-2 text-right font-semibold tabular-nums ${total === WEIGHT_TOTAL ? "" : "text-primary"}`} aria-live="polite">
              {total}%{total !== WEIGHT_TOTAL && <span className="block text-[11px] font-normal">harus {WEIGHT_TOTAL}%</span>}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="outline" size="sm" disabled={rows.length >= 12} onClick={() => setRows((x) => [...x, { code: "", name: "", weight: "" }])}>
          <Plus /> Tambah komponen
        </Button>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          KKTP (opsional)
          <input inputMode="decimal" value={passing} onChange={(e) => setPassing(e.target.value)} placeholder="mis. 75" className={`${inputClass} w-28`} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={scheme ? "outline" : "default"}
          disabled={pending}
          onClick={() => run(() => (scheme ? apiSend("PUT", `/grade-schemes/${scheme.id}`, payload()) : apiSend("POST", "/grade-schemes", { ...create, ...payload() })))}
        >
          {scheme ? "Simpan draf" : "Buat draf"}
        </Button>
        {scheme && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={pending || total !== WEIGHT_TOTAL}
              onClick={() =>
                window.confirm("Terbitkan skema ini? Skema terbit tidak bisa diubah; perubahan berikutnya lewat versi baru.") &&
                run(async () => {
                  const save = await apiSend("PUT", `/grade-schemes/${scheme.id}`, payload());
                  return save.ok ? apiSend("POST", `/grade-schemes/${scheme.id}/publish`) : save;
                })
              }
            >
              Simpan & terbitkan
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => window.confirm("Buang draf ini?") && run(() => apiSend("DELETE", `/grade-schemes/${scheme.id}`))}>
              Buang draf
            </Button>
          </>
        )}
        {saved && !error && <span className="text-xs text-muted-foreground">Tersimpan.</span>}
      </div>
    </div>
  );
}

type Opt = { value: string; label: string };

export function OutcomeForm({ subjects, grades, row, defaults }: { subjects: Opt[]; grades: Opt[]; row?: LearningOutcomeView; defaults?: { subjectId?: string; gradeLevelId?: string } }) {
  const [open, setOpen] = useState(!row);
  if (!open)
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Ubah
      </Button>
    );
  return (
    <div className={row ? "rounded-lg border bg-muted/40 p-3" : ""}>
      <InlineForm
        method={row ? "PUT" : "POST"}
        path={row ? `/learning-outcomes/${row.id}` : "/learning-outcomes"}
        schema={LearningOutcomeSchema}
        submitLabel={row ? "Simpan" : "Tambah capaian"}
        resetOnSuccess={!row}
        onSuccess={() => row && setOpen(false)}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        fields={(e) => (
          <>
            <SelectField name="subjectId" label="Mata pelajaran" required defaultValue={row?.subject.id ?? defaults?.subjectId} placeholder="Pilih…" options={subjects} errors={e} />
            <SelectField name="gradeLevelId" label="Tingkat" required defaultValue={row?.gradeLevel.id ?? defaults?.gradeLevelId} placeholder="Pilih…" options={grades} errors={e} />
            <TextField name="code" label="Kode" required defaultValue={row?.code} errors={e} description="mis. CP-1" />
            <SelectField
              name="status"
              label="Status"
              defaultValue={row?.status ?? "ACTIVE"}
              options={[
                { value: "ACTIVE", label: "Aktif" },
                { value: "INACTIVE", label: "Nonaktif" },
              ]}
              errors={e}
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <TextAreaField name="description" label="Deskripsi capaian" required defaultValue={row?.description} errors={e} />
            </div>
          </>
        )}
      />
      {row && (
        <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
          Tutup
        </Button>
      )}
    </div>
  );
}
