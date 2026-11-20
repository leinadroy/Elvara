"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateAcademicYearSchema } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";

type TermRow = { key: number };

export function AcademicYearForm() {
  const router = useRouter();
  const form = useApiForm();
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState<TermRow[]>([{ key: 1 }, { key: 2 }]);

  if (!open) {
    return (
      <div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Buat tahun ajaran
        </Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values = {
      name: fd.get("name"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
      terms: terms.map((_, i) => ({
        name: fd.get(`terms.${i}.name`),
        sequence: i + 1,
        startDate: fd.get(`terms.${i}.startDate`),
        endDate: fd.get(`terms.${i}.endDate`),
      })),
    };
    const ok = await form.run({ schema: CreateAcademicYearSchema, values, send: (v) => apiSend("POST", "/academic-years", v) });
    if (ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-4 rounded-lg border p-4">
      <h2 className="font-medium">Tahun ajaran baru</h2>
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField name="name" label="Nama" required placeholder="2027/2028" errors={form.fieldErrors} />
        <TextField name="startDate" label="Mulai" type="date" required errors={form.fieldErrors} />
        <TextField name="endDate" label="Selesai" type="date" required errors={form.fieldErrors} />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Semester</legend>
        {terms.map((t, i) => (
          <div key={t.key} className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-3">
            <TextField name={`terms.${i}.name`} label={`Nama semester ${i + 1}`} required defaultValue={i === 0 ? "Semester Ganjil" : i === 1 ? "Semester Genap" : ""} errors={form.fieldErrors} />
            <TextField name={`terms.${i}.startDate`} label="Mulai" type="date" required errors={form.fieldErrors} />
            <TextField name={`terms.${i}.endDate`} label="Selesai" type="date" required errors={form.fieldErrors} />
          </div>
        ))}
        <div className="flex gap-2">
          {terms.length < 6 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setTerms((p) => [...p, { key: Date.now() }])}>
              + Tambah semester
            </Button>
          )}
          {terms.length > 1 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setTerms((p) => p.slice(0, -1))}>
              − Hapus semester terakhir
            </Button>
          )}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">Tahun ajaran baru dibuat sebagai draf. Aktifkan setelah semua data siap.</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={form.pending}>
          {form.pending ? "Menyimpan…" : "Simpan sebagai draf"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}
