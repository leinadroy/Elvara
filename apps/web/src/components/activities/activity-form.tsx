"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTIVITY_KIND_LABELS, ActivitySchema, UpdateActivitySchema, type ActivityView } from "@smart-school/contracts";
import { CheckboxField, SelectField, TextAreaField, TextField, toOptions } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";

type Opt = { value: string; label: string };

/** "YYYY-MM-DDTHH:MM" untuk input datetime-local (zona browser) dari ISO. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const inDays = (days: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/**
 * Form tugas baru / ubah tugas. Waktu diisi dalam zona waktu perangkat lalu dikirim sebagai ISO. Tugas baru
 * tersimpan sebagai draf; bila komponen dipilih, dibuat penilaian tertaut di buku nilai.
 */
export function ActivityForm({ teachingAssignmentId, components, row }: { teachingAssignmentId: string; components: Opt[]; row?: ActivityView }) {
  const router = useRouter();
  const [defaults] = useState(() => ({ opensAt: row ? toLocalInput(row.opensAt) : toLocalInput(new Date().toISOString()), dueAt: row ? toLocalInput(row.dueAt) : toLocalInput(inDays(7, 23, 59)) }));
  return (
    <InlineForm<{ id: string }>
      method={row ? "PUT" : "POST"}
      path={row ? `/activities/${row.id}` : "/activities"}
      schema={row ? UpdateActivitySchema : ActivitySchema}
      submitLabel={row ? "Simpan perubahan" : "Simpan sebagai draf"}
      booleans={["allowLate", "allowResubmit", "acceptsSubmissions"]}
      resetOnSuccess={false}
      transform={(v) => {
        const base = { ...v, opensAt: v.opensAt ? new Date(String(v.opensAt)).toISOString() : v.opensAt, dueAt: v.dueAt ? new Date(String(v.dueAt)).toISOString() : v.dueAt, instructions: v.instructions ?? "" };
        // Mengubah tugas tidak mengubah tautan komponen nilai.
        if (row) return Object.fromEntries(Object.entries(base).filter(([k]) => k !== "componentId"));
        return { ...base, teachingAssignmentId };
      }}
      onSuccess={(d) => {
        if (!row && d?.id) router.push(`/teacher/assignments/${d.id}`);
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      fields={(e) => (
        <>
          <div className="sm:col-span-2">
            <TextField name="title" label="Judul" required defaultValue={row?.title} errors={e} />
          </div>
          <SelectField name="kind" label="Jenis" defaultValue={row?.kind ?? "ASSIGNMENT"} options={toOptions(ACTIVITY_KIND_LABELS)} errors={e} />
          {!row ? <SelectField name="componentId" label="Komponen nilai" placeholder="Tanpa nilai" options={components} errors={e} /> : <div />}
          <TextField name="opensAt" label="Dibuka" type="datetime-local" required defaultValue={defaults.opensAt} errors={e} />
          <TextField name="dueAt" label="Tenggat" type="datetime-local" required defaultValue={defaults.dueAt} errors={e} />
          <div className="flex flex-col gap-2 sm:col-span-2">
            <CheckboxField name="acceptsSubmissions" label="Dikumpulkan lewat aplikasi" defaultChecked={row?.acceptsSubmissions ?? true} />
            <CheckboxField name="allowResubmit" label="Boleh kirim ulang sampai tenggat" defaultChecked={row?.allowResubmit ?? true} />
            <CheckboxField name="allowLate" label="Terima kiriman terlambat (ditandai terlambat)" defaultChecked={row?.allowLate ?? false} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <TextAreaField name="instructions" label="Instruksi" defaultValue={row?.instructions} errors={e} />
          </div>
        </>
      )}
    />
  );
}

export function EditActivity({ row }: { row: ActivityView }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Ubah tugas
      </Button>
    );
  return (
    <div className="w-full rounded-xl border bg-muted/40 p-3">
      <ActivityForm teachingAssignmentId={row.teachingAssignment.id} components={[]} row={row} />
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
        Tutup
      </Button>
    </div>
  );
}
