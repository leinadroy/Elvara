import type { Metadata } from "next";
import { Suspense } from "react";
import type { AccountSummary } from "@smart-school/contracts";
import { ApiErrorState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, getMe } from "@/lib/api-server";
import { AccountsTable } from "./accounts-table";

export const metadata: Metadata = { title: "Akun pengguna" };

async function Content() {
  const [me, res] = await Promise.all([getMe(), apiGet<AccountSummary[]>("/accounts")]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return <AccountsTable accounts={res.data} currentUserId={me.user.id} />;
}

export default function AccountsPage() {
  return (
    <>
      <PageHeader
        title="Akun pengguna"
        description="Akun dibuat lewat undangan dari halaman siswa atau pegawai. Akun dinonaktifkan, bukan dihapus, agar riwayatnya tetap utuh."
      />
      <Suspense fallback={<LoadingBlock />}>
        <Content />
      </Suspense>
    </>
  );
}
