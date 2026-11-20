import type { Metadata } from "next";
import { Suspense } from "react";
import type { GuardianListItem, Paginated } from "@smart-school/contracts";
import { ListToolbar } from "@/components/list-toolbar";
import { ApiErrorState, EmptyState, LinkButton, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams, getMe, toQuery } from "@/lib/api-server";
import { GuardiansTable } from "./guardians-table";

export const metadata: Metadata = { title: "Orang tua / wali" };
const BASE = "/admin/guardians";

async function Actions() {
  const me = await getMe();
  return me.permissions.includes("people:manage") ? <LinkButton href={`${BASE}/new`}>Tambah wali</LinkButton> : null;
}

async function GuardianList({ searchParams }: { searchParams: PageProps<"/admin/guardians">["searchParams"] }) {
  const sp = flatParams(await searchParams);
  const res = await apiGet<Paginated<GuardianListItem>>(`/guardians${toQuery(sp, ["q", "page", "pageSize"])}`);
  // Akses ditolak: jangan tampilkan pencarian/filter yang tidak bisa dipakai.
  if (!res.ok && res.status === 403) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <ListToolbar basePath={BASE} searchParams={sp} searchLabel="Cari nama atau email" />
      {!res.ok ? (
        <ApiErrorState status={res.status} error={res.error} />
      ) : res.data.total === 0 ? (
        <EmptyState title={sp.q ? "Tidak ada wali yang cocok" : "Belum ada data wali"} description="Wali ditautkan ke siswa dari halaman detail siswa." />
      ) : (
        <GuardiansTable data={res.data.items} total={res.data.total} page={res.data.page} pageSize={res.data.pageSize} searchParams={sp} />
      )}
    </>
  );
}

export default function GuardiansPage({ searchParams }: PageProps<"/admin/guardians">) {
  return (
    <>
      <PageHeader
        title="Orang tua / wali"
        description="Data wali. Hak melihat data anak diatur per siswa dan baru aktif setelah wali memverifikasi undangan."
        actions={
          <Suspense fallback={null}>
            <Actions />
          </Suspense>
        }
      />
      <Suspense fallback={<LoadingBlock />}>
        <GuardianList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
