"use client";

import { CreateActivitySchema, type TeacherAssessmentOption } from "@smart-school/contracts";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";

const kinds = [
  { value: "ASSIGNMENT", label: "Tugas" },
  { value: "QUIZ", label: "Kuis" },
  { value: "EXAM", label: "Ujian" },
  { value: "PRACTICE", label: "Praktik" },
];

function toIso(value: unknown) {
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function ActivityForm({ assignment }: { assignment: TeacherAssessmentOption }) {
  return <InlineForm
    path="/activities"
    schema={CreateActivitySchema}
    submitLabel="Simpan kegiatan"
    booleans={["allowLate", "allowResubmit", "acceptsSubmissions"]}
    className="grid gap-3 sm:grid-cols-2"
    transform={(values) => ({
      ...values, teachingAssignmentId: assignment.teachingAssignmentId,
      instructions: values.instructions ?? "", opensAt: toIso(values.opensAt), dueAt: toIso(values.dueAt),
    })}
    fields={(errors) => <>
      <TextField name="title" label="Judul kegiatan" required errors={errors} />
      <SelectField name="kind" label="Jenis" defaultValue="ASSIGNMENT" options={kinds} errors={errors} />
      <SelectField name="componentId" label="Komponen nilai" required options={assignment.components.map((component) => ({ value: component.id, label: component.name }))} errors={errors} />
      <TextField name="opensAt" label="Waktu buka (zona perangkat)" type="datetime-local" required errors={errors} />
      <TextField name="dueAt" label="Tenggat (zona perangkat)" type="datetime-local" required errors={errors} />
      <div className="sm:col-span-2"><TextAreaField name="instructions" label="Instruksi" errors={errors} /></div>
      <CheckboxField name="acceptsSubmissions" label="Terima kiriman di Elvara" defaultChecked />
      <CheckboxField name="allowLate" label="Terima kiriman terlambat" />
      <CheckboxField name="allowResubmit" label="Izinkan kirim ulang sebelum tenggat" defaultChecked />
    </>}
  />;
}
