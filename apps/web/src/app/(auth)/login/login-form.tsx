"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginSchema, MfaVerifyLoginSchema, type LoginResponse } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField, formToObject, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";

/** Login dua tahap: email + kata sandi, lalu kode autentikator bila verifikasi dua langkah aktif. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useApiForm();
  const [challenge, setChallenge] = useState<string | null>(null);

  function finish(res: LoginResponse) {
    if (res.mfaRequired) {
      setChallenge(res.challenge);
      return;
    }
    router.replace(res.activeRole === "GUARDIAN" && next === "/dashboard" ? "/guardian/children" : next);
    router.refresh();
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await form.run<LoginResponse>({ schema: LoginSchema, values: formToObject(e.currentTarget), send: (v) => apiSend<LoginResponse>("POST", "/auth/login", v) });
    if (res) finish(res);
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await form.run<LoginResponse>({
      schema: MfaVerifyLoginSchema,
      values: { ...formToObject(e.currentTarget), challenge },
      send: (v) => apiSend<LoginResponse>("POST", "/auth/mfa/verify", v),
    });
    if (res) finish(res);
    else if (form.error?.code === "UNAUTHENTICATED" && /berakhir/.test(form.error.message)) setChallenge(null);
  }

  if (challenge) {
    return (
      <form key="code" method="post" onSubmit={onCode} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Buka aplikasi autentikator di ponsel Anda, lalu masukkan kode 6 digit untuk Elvara.</p>
        <FormErrorSummary error={form.error} />
        <TextField name="code" label="Kode verifikasi" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" errors={form.fieldErrors} />
        <Button type="submit" disabled={form.pending} className="w-full">
          {form.pending ? "Memeriksa…" : "Verifikasi"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setChallenge(null)}>
          Kembali ke email dan kata sandi
        </Button>
      </form>
    );
  }

  return (
    <form key="password" method="post" onSubmit={onPassword} noValidate className="flex flex-col gap-4">
      <FormErrorSummary error={form.error} />
      <TextField name="email" label="Email" type="email" autoComplete="username" inputMode="email" required errors={form.fieldErrors} />
      <TextField name="password" label="Kata sandi" type="password" autoComplete="current-password" required errors={form.fieldErrors} />
      <Button type="submit" disabled={form.pending} className="w-full">
        {form.pending ? "Memeriksa…" : "Masuk"}
      </Button>
      <p className="text-xs text-muted-foreground">Lupa kata sandi atau belum punya akun? Hubungi admin sekolah untuk dikirimi tautan undangan.</p>
    </form>
  );
}
