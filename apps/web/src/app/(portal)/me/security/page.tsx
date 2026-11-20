import type { Metadata } from "next";
import { Suspense } from "react";
import type { MfaStatus } from "@smart-school/contracts";
import { ApiErrorState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { MfaPanel, PasswordForm } from "./security-forms";

export const metadata: Metadata = { title: "Keamanan akun" };

async function Mfa() {
  const res = await apiGet<MfaStatus>("/auth/mfa");
  return res.ok ? <MfaPanel status={res.data} /> : <ApiErrorState status={res.status} error={res.error} />;
}

export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Keamanan akun" description="Kata sandi dan verifikasi dua langkah." />
      <section id="password" aria-labelledby="password-title" className="flex scroll-mt-20 flex-col gap-3 overflow-hidden rounded-2xl border bg-card">
        <div aria-hidden="true" className="h-1.5 bg-[var(--module)]" />
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
          <h2 id="password-title" className="text-lg font-bold">
            Ganti kata sandi
          </h2>
          <PasswordForm />
        </div>
      </section>
      <section id="mfa" aria-labelledby="mfa-title" className="flex scroll-mt-20 flex-col gap-3 overflow-hidden rounded-2xl border bg-card">
        <div aria-hidden="true" className="h-1.5 bg-[var(--module)]" />
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
          <h2 id="mfa-title" className="text-lg font-bold">
            Verifikasi dua langkah
          </h2>
          <Suspense fallback={<LoadingBlock rows={2} />}>
            <Mfa />
          </Suspense>
        </div>
      </section>
    </>
  );
}
