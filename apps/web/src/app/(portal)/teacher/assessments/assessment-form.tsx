"use client";

import { CreateAssessmentSchema, type TeacherAssessmentOption } from "@smart-school/contracts";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";

/** Form draf sederhana; komponen hanya berasal dari skema nilai terbit kelas terpilih. */
export function AssessmentForm({ assignment }: { assignment: TeacherAssessmentOption }) {
  return (
    <InlineForm
      path="/assessments"
      schema={CreateAssessmentSchema}
      submitLabel="Simpan penilaian draf"
      className="grid gap-3 sm:grid-cols-2"
      transform={(values) => ({
        ...values,
        teachingAssignmentId: assignment.teachingAssignmentId,
        assessedOn: values.assessedOn || undefined,
      })}
      fields={(errors) => (
        <>
          <TextField name="title" label="Judul penilaian" required errors={errors} placeholder="Mis. Sumatif bab 1" />
          <SelectField name="componentId" label="Komponen nilai" required errors={errors} options={assignment.components.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))} placeholder="Pilih komponen" />
          <TextField name="assessedOn" label="Tanggal penilaian" type="date" errors={errors} />
        </>
      )}
    />
  );
}
