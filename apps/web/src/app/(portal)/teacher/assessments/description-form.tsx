"use client";

import { useId, useState } from "react";
import { InlineForm } from "@/components/inline-form";
import { Textarea } from "@/components/ui/textarea";

export type LearningOutcomeOption = { id: string; code: string; description: string };

const FIELDS = [
  ["highestAchievement", "Capaian tertinggi"],
  ["needsImprovement", "Perlu ditingkatkan"],
] as const;
type Field = (typeof FIELDS)[number][0];

/**
 * Deskripsi capaian rapor satu siswa (FR-15.3). Teks boleh diketik bebas atau diambil dari capaian pembelajaran
 * (CP) yang ditetapkan kurikulum, lalu disunting.
 */
export function DescriptionForm({ assignmentId, studentId, highestAchievement, needsImprovement, outcomes = [] }: {
  assignmentId: string; studentId: string; highestAchievement: string | null; needsImprovement: string | null; outcomes?: LearningOutcomeOption[];
}) {
  const id = useId();
  const [values, setValues] = useState<Record<Field, string>>({ highestAchievement: highestAchievement ?? "", needsImprovement: needsImprovement ?? "" });
  const append = (field: Field, outcomeId: string) => {
    const o = outcomes.find((x) => x.id === outcomeId);
    if (o) setValues((v) => ({ ...v, [field]: v[field].trim() ? `${v[field].trim()} ${o.description}` : o.description }));
  };
  return <InlineForm method="PUT" path="/report-cards/subject-description"
    submitLabel="Simpan deskripsi" resetOnSuccess={false} className="grid gap-3 md:grid-cols-2"
    transform={(raw) => ({ ...raw, teachingAssignmentId: assignmentId, studentId })}
    fields={(errors) => <>
      {FIELDS.map(([name, label]) => {
        const fieldId = `${id}-${name}`;
        const errs = errors[name];
        return <div key={name} className="flex min-w-0 flex-col gap-1 text-sm">
          <label htmlFor={fieldId} className="font-medium">{label} <span aria-hidden="true" className="text-primary">*</span></label>
          <Textarea id={fieldId} name={name} required maxLength={1500} value={values[name]} onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
            aria-invalid={errs?.length ? true : undefined} aria-describedby={errs?.length ? `${fieldId}-err` : undefined} />
          {outcomes.length > 0 && <select aria-label={`Tambah ${label.toLowerCase()} dari capaian pembelajaran`} value=""
            onChange={(e) => append(name, e.target.value)} className="w-full min-w-0 rounded-md border bg-background px-1.5 py-1 text-xs text-muted-foreground">
            <option value="">+ Tambah dari capaian pembelajaran…</option>
            {outcomes.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.description.slice(0, 80)}</option>)}
          </select>}
          {errs?.length ? <p id={`${fieldId}-err`} role="alert" className="text-xs text-destructive">{errs.join(" ")}</p> : null}
        </div>;
      })}
    </>} />;
}
