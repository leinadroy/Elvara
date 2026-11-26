"use client";

import { TextAreaField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";

export function DescriptionForm({ assignmentId, studentId, highestAchievement, needsImprovement }: {
  assignmentId: string; studentId: string; highestAchievement: string | null; needsImprovement: string | null;
}) {
  return <InlineForm method="PUT" path="/report-cards/subject-description"
    submitLabel="Simpan deskripsi" resetOnSuccess={false}
    transform={(values) => ({ ...values, teachingAssignmentId: assignmentId, studentId })}
    fields={(errors) => <>
      <TextAreaField name="highestAchievement" label="Capaian tertinggi" defaultValue={highestAchievement} required errors={errors} />
      <TextAreaField name="needsImprovement" label="Perlu ditingkatkan" defaultValue={needsImprovement} required errors={errors} />
    </>} />;
}
