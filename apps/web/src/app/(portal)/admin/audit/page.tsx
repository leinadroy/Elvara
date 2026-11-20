import type { Metadata } from "next";
import { Suspense } from "react";
import type { AuditEventView, Paginated } from "@smart-school/contracts";
import { ListToolbar } from "@/components/list-toolbar";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams, toQuery } from "@/lib/api-server";
import { AuditTable } from "./audit-table";

export const metadata: Metadata = { title: "Log audit" };
const BASE = "/admin/audit";

const ACTION_GROUPS = [
  { value: "auth.", label: "Masuk & keluar" },
  { value: "account.", label: "Akun" },
  { value: "invitation.", label: "Undangan" },
  { value: "student.", label: "Siswa" },
  { value: "employee.", label: "Pegawai" },
  { value: "guardian", label: "Wali & tautan wali" },
  { value: "academic_year.", label: "Tahun ajaran" },
  { value: "import.", label: "Impor" },
] as const;

async function Content({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  const sp = flatParams(await searchParams);
  const query = toQuery({ ...sp, action: sp.action ?? sp.q }, ["page", "pageSize", "action", "entityType", "entityId"]);
  const res = await apiGet<Paginated<AuditEventView>>(`/audit-events${query}`);
  // Akses ditolak: jangan tampilkan pencarian/filter yang tidak bisa dipakai.
  if (!res.ok && res.status === 403) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <ListToolbar
        basePath={BASE}
        searchParams={sp}
        searchLabel="Awalan aksi (mis. student.create)"
        filters={[{ name: "action", label: "Kelompok", allLabel: "Semua aksi", options: ACTION_GROUPS }]}
      />
      {!res.ok ? (
        <ApiErrorState status={res.status} error={res.error} />
      ) : res.data.total === 0 ? (
        <EmptyState title="Tidak ada catatan" />
      ) : (
        <AuditTable data={res.data.items} total={res.data.total} page={res.data.page} pageSize={res.data.pageSize} searchParams={sp} />
      )}
    </>
  );
}

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <>
      <PageHeader title="Log audit" description="Catatan tindakan penting. Catatan tidak dapat diubah atau dihapus." />
      <Suspense fallback={<LoadingBlock />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
