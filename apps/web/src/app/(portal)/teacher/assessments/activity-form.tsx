"use client";

import { useState } from "react";
import { CreateActivitySchema, UpdateActivitySchema, type TeacherAssessmentOption } from "@smart-school/contracts";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";

const kinds = [
  { value: "ASSIGNMENT", label: "Tugas" },
  { value: "QUIZ", label: "Kuis" },
  { value: "EXAM", label: "Ujian" },
  { value: "PRACTICE", label: "Praktik" },
];

/** Kegiatan yang sudah ada, untuk mengisi form ubah. */
export type EditableActivity = {
  id: string; title: string; kind: string; instructions: string; opensAt: string; dueAt: string;
  allowLate: boolean; allowResubmit: boolean; acceptsSubmissions: boolean;
};

function toIso(value: unknown) {
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

/** ISO → "YYYY-MM-DDTHH:MM" untuk input datetime-local (zona perangkat). */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Form kegiatan baru atau ubah kegiatan. Komponen nilai opsional: tanpa komponen, kegiatan tidak dinilai
 * (mis. latihan) dan tidak masuk nilai akhir. Tautan komponen tidak berubah saat kegiatan diubah.
 */
export function ActivityForm({ assignment, activity, onDone }: { assignment: TeacherAssessmentOption; activity?: EditableActivity; onDone?: () => void }) {
  const [defaults] = useState(() => (activity ? { opensAt: toLocalInput(activity.opensAt), dueAt: toLocalInput(activity.dueAt) } : { opensAt: undefined, dueAt: undefined }));
  return <InlineForm
    method={activity ? "PUT" : "POST"}
    path={activity ? `/activities/${activity.id}` : "/activities"}
    schema={activity ? UpdateActivitySchema : CreateActivitySchema}
    submitLabel={activity ? "Simpan perubahan" : "Simpan kegiatan"}
    resetOnSuccess={!activity}
    onSuccess={onDone}
    booleans={["allowLate", "allowResubmit", "acceptsSubmissions"]}
    className="grid gap-3 sm:grid-cols-2"
    transform={(values) => {
      const { componentId, ...rest } = values;
      const base = { ...rest, instructions: values.instructions ?? "", opensAt: toIso(values.opensAt), dueAt: toIso(values.dueAt) };
      if (activity) return base;
      return { ...base, teachingAssignmentId: assignment.teachingAssignmentId, ...(componentId ? { componentId } : {}) };
    }}
    fields={(errors) => <>
      <TextField name="title" label="Judul kegiatan" required defaultValue={activity?.title} errors={errors} />
      <SelectField name="kind" label="Jenis" defaultValue={activity?.kind ?? "ASSIGNMENT"} options={kinds} errors={errors} />
      {!activity && <SelectField name="componentId" label="Komponen nilai" placeholder="Tanpa nilai (latihan)" options={assignment.components.map((component) => ({ value: component.id, label: component.name }))} errors={errors}
        description={assignment.components.length ? "Pilih komponen agar kiriman dinilai di lembar nilai." : "Skema nilai belum terbit; kegiatan dibuat tanpa nilai."} />}
      <TextField name="opensAt" label="Waktu buka (zona perangkat)" type="datetime-local" required defaultValue={defaults.opensAt} errors={errors} />
      <TextField name="dueAt" label="Tenggat (zona perangkat)" type="datetime-local" required defaultValue={defaults.dueAt} errors={errors} />
      <div className="sm:col-span-2"><TextAreaField name="instructions" label="Instruksi" defaultValue={activity?.instructions} errors={errors} /></div>
      <CheckboxField name="acceptsSubmissions" label="Terima kiriman di Elvara" defaultChecked={activity?.acceptsSubmissions ?? true} />
      <CheckboxField name="allowLate" label="Terima kiriman terlambat" defaultChecked={activity?.allowLate ?? false} />
      <CheckboxField name="allowResubmit" label="Izinkan kirim ulang sebelum tenggat" defaultChecked={activity?.allowResubmit ?? true} />
    </>}
  />;
}

/** Tombol "Ubah" yang membuka form ubah kegiatan di tempat. */
export function EditActivity({ assignment, activity }: { assignment: TeacherAssessmentOption; activity: EditableActivity }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Ubah</Button>;
  return <div className="w-full rounded-lg border bg-muted/40 p-3">
    <ActivityForm assignment={assignment} activity={activity} onDone={() => setOpen(false)} />
    <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Tutup</Button>
  </div>;
}
