"use client";

import { useRef } from "react";
import { InlineForm } from "@/components/inline-form";
import { TextAreaField } from "@/components/form";

export function SubmitActivity({ id, resubmit }: { id: string; resubmit: boolean }) {
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  return <InlineForm
    path={`/activities/${id}/submissions`}
    submitLabel={resubmit ? "Kirim versi baru" : "Kirim jawaban"}
    className="grid gap-2"
    transform={({ text, file }) => {
      const attachment = file instanceof File && file.size > 0 ? file : null;
      const answer = typeof text === "string" ? text.trim() : "";
      const signature = JSON.stringify([answer, attachment?.name, attachment?.size, attachment?.lastModified]);
      if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
      const body = new FormData();
      body.set("text", answer);
      body.set("idempotencyKey", attempt.current.key);
      if (attachment) body.set("file", attachment);
      return body;
    }}
    onSuccess={() => { attempt.current = null; }}
    fields={(errors) => <>
      <TextAreaField name="text" label="Jawaban" errors={errors} />
      <label className="grid gap-1 text-sm">
        Lampiran (PDF, JPG, PNG, maks. 5 MB)
        <input className="text-sm" type="file" name="file" accept="application/pdf,image/jpeg,image/png" />
      </label>
    </>}
  />;
}
