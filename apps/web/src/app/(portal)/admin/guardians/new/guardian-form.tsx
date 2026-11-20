"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { CreateGuardianSchema } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField, formToObject, useApiForm } from "@/components/form";
import { PersonFields } from "@/components/people-form-fields";
import { apiSend } from "@/lib/api-client";

/** Di form ini email wajib, karena tanpa email wali tidak bisa diundang untuk verifikasi. */
const Schema = CreateGuardianSchema.extend({ email: z.string().trim().toLowerCase().pipe(z.email({ error: "Email wajib diisi untuk undangan wali." })) });

export function GuardianForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useApiForm();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const created = await form.run<{ id: string }>({ schema: Schema, values: formToObject(e.currentTarget), send: (v) => apiSend("POST", "/guardians", v) });
    if (created) {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-4">
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      <PersonFields errors={form.fieldErrors} emailRequired />
      <TextField name="occupation" label="Pekerjaan" errors={form.fieldErrors} />
      <div>
        <Button type="submit" disabled={form.pending}>
          {form.pending ? "Menyimpan…" : "Simpan wali"}
        </Button>
      </div>
    </form>
  );
}
