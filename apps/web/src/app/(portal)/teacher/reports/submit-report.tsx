"use client";

import { InlineForm } from "@/components/inline-form";
import { TextAreaField } from "@/components/form";

export function SubmitReport({ classGroupId, termId, studentId, note }: {
  classGroupId: string; termId: string; studentId: string; note: string | null;
}) {
  return <InlineForm path="/report-cards/submit" className="grid gap-2" submitLabel="Ajukan rapor"
    transform={({ homeroomNote }) => ({ classGroupId, termId, studentId, homeroomNote: homeroomNote ?? undefined })}
    fields={(errors) => <TextAreaField name="homeroomNote" label="Catatan wali kelas" defaultValue={note} errors={errors} />} />;
}
