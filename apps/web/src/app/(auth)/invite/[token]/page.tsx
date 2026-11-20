import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ROLE_LABELS, type InvitationPreview } from "@smart-school/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { AcceptInvitationForm } from "./accept-form";

/** Token ada di URL: jangan bocorkan lewat header Referer ke situs lain. */
export const metadata: Metadata = { title: "Undangan", referrer: "no-referrer" };

async function Invitation({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  const res = await apiGet<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`, { allow404: true });
  if (!res.ok) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-xl">Undangan tidak dapat dipakai</CardTitle>
          <CardDescription>{res.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Minta admin sekolah mengirim tautan baru, atau{" "}
            <Link href="/login" className="underline">
              masuk
            </Link>{" "}
            bila akun Anda sudah aktif.
          </p>
        </CardContent>
      </>
    );
  }
  const inv = res.data;
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Undangan dari {inv.schoolName}</CardTitle>
        <CardDescription>
          {inv.studentName
            ? `${inv.personName}, Anda diundang sebagai orang tua/wali dari ${inv.studentName}.`
            : `${inv.personName}, Anda diundang dengan peran ${ROLE_LABELS[inv.role]}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Email akun</dt>
            <dd className="font-medium">{inv.email}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Berlaku sampai</dt>
            <dd>{formatDateTime(inv.expiresAt)}</dd>
          </div>
        </dl>
        <AcceptInvitationForm token={token} hasAccount={inv.hasAccount} email={inv.email} role={inv.role} />
      </CardContent>
    </>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <Suspense fallback={<CardContent><LoadingBlock rows={3} label="Memeriksa undangan…" /></CardContent>}>
          <Invitation params={params} />
        </Suspense>
      </Card>
    </main>
  );
}
