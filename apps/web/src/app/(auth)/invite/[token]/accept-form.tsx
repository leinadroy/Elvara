"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { PasswordSchema, type RoleKey } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField, formToObject, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";

const NewAccountSchema = z
  .object({ password: PasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Konfirmasi kata sandi tidak sama." });

export function AcceptInvitationForm({ token, hasAccount, email, role }: { token: string; hasAccount: boolean; email: string; role: RoleKey }) {
  const router = useRouter();
  const form = useApiForm();
  const path = `/invitations/${encodeURIComponent(token)}/accept`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await form.run<{ createdAccount: boolean }>({
      schema: hasAccount ? undefined : NewAccountSchema,
      values: hasAccount ? {} : formToObject(e.currentTarget),
      send: (values) => apiSend("POST", path, hasAccount ? {} : { password: (values as { password: string }).password }),
    });
    if (result) {
      router.replace(role === "GUARDIAN" ? "/guardian/children" : "/dashboard");
      router.refresh();
    }
  }

  const loginRequired = form.error?.code === "LOGIN_REQUIRED";

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      {loginRequired && (
        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="text-sm underline">
          Masuk sebagai {email}, lalu kembali ke halaman ini
        </Link>
      )}
      {hasAccount ? (
        <p className="text-sm text-muted-foreground">Akun dengan email ini sudah ada. Pastikan Anda sudah masuk sebagai {email}, lalu terima undangan.</p>
      ) : (
        <>
          <TextField name="password" label="Buat kata sandi" type="password" autoComplete="new-password" required description="Minimal 10 karakter." errors={form.fieldErrors} />
          <TextField name="confirm" label="Ulangi kata sandi" type="password" autoComplete="new-password" required errors={form.fieldErrors} />
        </>
      )}
      <Button type="submit" disabled={form.pending}>
        {form.pending ? "Memproses…" : hasAccount ? "Terima undangan" : "Buat akun dan terima undangan"}
      </Button>
    </form>
  );
}
