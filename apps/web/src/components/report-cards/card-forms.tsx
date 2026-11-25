"use client";

import { ReportCardNoteSchema, ReturnReportCardSchema, ReviseReportCardSchema } from "@smart-school/contracts";
import { useState } from "react";
import { TextAreaField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";

/** Catatan wali kelas (draf/dikembalikan). */
export function NoteForm({ id, note }: { id: string; note: string | null }) {
  return (
    <InlineForm
      method="PUT"
      path={`/report-cards/${id}/note`}
      schema={ReportCardNoteSchema}
      submitLabel="Simpan catatan"
      resetOnSuccess={false}
      transform={(v) => ({ homeroomNote: v.homeroomNote ? String(v.homeroomNote) : null })}
      className="grid gap-3"
      fields={(e) => <TextAreaField name="homeroomNote" label="Catatan wali kelas" defaultValue={note} errors={e} description="Tampil di rapor. Maksimal 1000 karakter." />}
    />
  );
}

/** Form beralasan yang dibuka dengan tombol: kembalikan rapor (pimpinan) atau buka revisi (wali kelas). */
export function ReasonAction({ kind, id }: { kind: "return" | "revise"; id: string }) {
  const [open, setOpen] = useState(false);
  const t =
    kind === "return"
      ? { button: "Kembalikan ke wali kelas", path: `/report-cards/${id}/return`, schema: ReturnReportCardSchema, name: "note", label: "Catatan untuk wali kelas", submit: "Kembalikan" }
      : { button: "Buka revisi", path: `/report-cards/${id}/revise`, schema: ReviseReportCardSchema, name: "reason", label: "Alasan revisi", submit: "Buka revisi" };
  if (!open)
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t.button}
      </Button>
    );
  return (
    <div className="w-full rounded-xl border bg-muted/40 p-3">
      <InlineForm path={t.path} schema={t.schema} submitLabel={t.submit} className="grid gap-3" onSuccess={() => setOpen(false)} fields={(e) => <TextAreaField name={t.name} label={t.label} required errors={e} />} />
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
        Batal
      </Button>
    </div>
  );
}
