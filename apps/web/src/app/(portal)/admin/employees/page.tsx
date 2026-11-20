import type { Metadata } from "next";
import { Suspense } from "react";
import type { EmployeeListItem, Paginated } from "@smart-school/contracts";
import { ListToolbar } from "@/components/list-toolbar";
import { ApiErrorState, EmptyState, LinkButton, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams, getMe, toQuery } from "@/lib/api-server";
import { EmployeesTable } from "./employees-table";

export const metadata: Metadata = { title: "Pegawai" };
const BASE = "/admin/employees";

async function Actions() {
  const me = await getMe();
  return me.permissions.includes("people:manage") ? <LinkButton href={`${BASE}/new`}>Tambah pegawai</LinkButton> : null;
}

async function EmployeeList({ searchParams }: { searchParams: PageProps<"/admin/employees">["searchParams"] }) {
  const sp = flatParams(await searchParams);
  const res = await apiGet<Paginated<EmployeeListItem>>(`/employees${toQuery(sp, ["q", "page", "pageSize", "sort", "status", "isTeacher"])}`);
  // Akses ditolak: jangan tampilkan pencarian/filter yang tidak bisa dipakai.
  if (!res.ok && res.status === 403) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <ListToolbar
        basePath={BASE}
        searchParams={sp}
        searchLabel="Cari nama, nomor pegawai, atau NIP"
        filters={[
          { name: "status", label: "Status", allLabel: "Semua status", options: [{ value: "ACTIVE", label: "Aktif" }, { value: "INACTIVE", label: "Nonaktif" }] },
          { name: "isTeacher", label: "Jenis", allLabel: "Guru & staf", options: [{ value: "true", label: "Guru" }, { value: "false", label: "Staf" }] },
        ]}
      />
      {!res.ok ? (
        <ApiErrorState status={res.status} error={res.error} />
      ) : res.data.total === 0 ? (
        <EmptyState title={sp.q || sp.status || sp.isTeacher ? "Tidak ada pegawai yang cocok" : "Belum ada data pegawai"} />
      ) : (
        <EmployeesTable data={res.data.items} total={res.data.total} page={res.data.page} pageSize={res.data.pageSize} searchParams={{ ...sp, sort: sp.sort ?? "name" }} />
      )}
    </>
  );
}

export default function EmployeesPage({ searchParams }: PageProps<"/admin/employees">) {
  return (
    <>
      <PageHeader
        title="Pegawai"
        description="Guru dan staf sekolah."
        actions={
          <Suspense fallback={null}>
            <Actions />
          </Suspense>
        }
      />
      <Suspense fallback={<LoadingBlock />}>
        <EmployeeList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
