"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MfaCodeSchema, PasswordSchema, type MfaSetup, type MfaStatus } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField, formToObject, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

const PasswordFormSchema = z
  .object({ currentPassword: z.string().min(1, { error: "Isi kata sandi saat ini." }), newPassword: PasswordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Konfirmasi tidak sama." });

export function PasswordForm() {
  const form = useApiForm();
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(false);
    const el = e.currentTarget;
    const ok = await form.run({
      schema: PasswordFormSchema,
      values: formToObject(el),
      send: (v) => {
        const { currentPassword, newPassword } = v as z.infer<typeof PasswordFormSchema>;
        return apiSend("POST", "/auth/password", { currentPassword, newPassword });
      },
    });
    if (ok !== null) {
      el.reset();
      setDone(true);
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-3">
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      {done && (
        <p role="status" className="rounded-lg bg-[var(--module-tint)] px-3 py-2 text-sm">
          Kata sandi diganti. Sesi di perangkat lain sudah diakhiri.
        </p>
      )}
      <TextField name="currentPassword" label="Kata sandi saat ini" type="password" autoComplete="current-password" required errors={form.fieldErrors} />
      <TextField name="newPassword" label="Kata sandi baru" type="password" autoComplete="new-password" required description="Minimal 10 karakter." errors={form.fieldErrors} />
      <TextField name="confirm" label="Ulangi kata sandi baru" type="password" autoComplete="new-password" required errors={form.fieldErrors} />
      <div>
        <Button type="submit" disabled={form.pending}>
          {form.pending ? "Menyimpan…" : "Ganti kata sandi"}
        </Button>
      </div>
    </form>
  );
}

function CodeForm({ label, path, onDone, submitLabel }: { label: string; path: string; onDone: () => void; submitLabel: string }) {
  const form = useApiForm();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await form.run({ schema: MfaCodeSchema, values: formToObject(e.currentTarget), send: (v) => apiSend("POST", path, v) });
    if (ok !== null) onDone();
  }
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex max-w-xs flex-col gap-3">
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      <TextField name="code" label={label} inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" errors={form.fieldErrors} />
      <div>
        <Button type="submit" disabled={form.pending}>
          {form.pending ? "Memeriksa…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Penyiapan TOTP: pindai QR (atau ketik kunci) di aplikasi autentikator, lalu konfirmasi dengan kode pertama. */
export function MfaPanel({ status }: { status: MfaStatus }) {
  const router = useRouter();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (!setup) return;
    QRCode.toString(setup.otpauthUrl, { type: "svg", margin: 1, width: 192 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [setup]);

  if (status.enabled) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p>
          <Badge>Aktif</Badge> sejak {formatDateTime(status.enabledAt)}. Setiap masuk, Anda diminta kode 6 digit dari aplikasi autentikator.
        </p>
        {disabling ? (
          <CodeForm label="Kode dari aplikasi untuk menonaktifkan" path="/auth/mfa/disable" submitLabel="Nonaktifkan" onDone={() => router.refresh()} />
        ) : (
          <div>
            <Button variant="outline" onClick={() => setDisabling(true)}>
              Nonaktifkan verifikasi dua langkah
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Ponsel hilang? Minta admin sekolah mereset verifikasi dua langkah akun Anda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>
        <Badge variant="outline">Belum aktif</Badge>{" "}
        {status.recommended ? "Sangat disarankan untuk peran Anda, karena menangani data penting sekolah." : "Tambahkan lapisan keamanan saat masuk."}
      </p>
      {!setup ? (
        <div>
          <Button
            onClick={async () => {
              setError(null);
              const res = await apiSend<MfaSetup>("POST", "/auth/mfa/setup");
              if (res.ok) setSetup(res.data);
              else setError(res.error.message);
            }}
          >
            Siapkan verifikasi dua langkah
          </Button>
          {error && (
            <p role="alert" className="mt-2 text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        <ol className="flex list-decimal flex-col gap-4 pl-5">
          <li>
            Pindai kode QR ini dengan aplikasi autentikator (Google Authenticator, Microsoft Authenticator, dsb.).
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {qr ? <span className="rounded-lg border bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="Kode QR penyiapan autentikator" /> : <span className="text-muted-foreground">Menyiapkan QR…</span>}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Atau ketik kunci ini secara manual:</span>
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs break-all select-all">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
              </div>
            </div>
          </li>
          <li>
            Masukkan kode 6 digit yang muncul di aplikasi.
            <div className="mt-2">
              <CodeForm label="Kode verifikasi" path="/auth/mfa/enable" submitLabel="Aktifkan" onDone={() => router.refresh()} />
            </div>
          </li>
        </ol>
      )}
    </div>
  );
}
