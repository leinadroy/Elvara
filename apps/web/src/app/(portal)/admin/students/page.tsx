import type { Metadata } from "next";
import { Suspense } from "react";
import { STUDENT_STATUS_LABELS, type Paginated, type StudentListItem } from "@smart-school/contracts";
import { ListToolbar } from "@/components/list-toolbar";
import { ApiErrorState, EmptyState, LinkButton, LoadingBlock, PageHeader } from "@/components/page-states";
import { toOptions } from "@/lib/ui";
import { apiGet, flatParams, getMe, toQuery } from "@/lib/api-server";
import { StudentsTable } from "./students-table";

export const metadata: Metadata = { title: "Siswa" };
const BASE = "/admin/students";

async function Actions() {
  const me = await getMe();
  return me.permissions.includes("people:manage") ? <LinkButton href={`${BASE}/new`}>Tambah siswa</LinkButton> : null;
}

async function StudentList({ searchParams }: { searchParams: PageProps<"/admin/students">["searchParams"] }) {
  const sp = flatParams(await searchParams);
  const res = await apiGet<Paginated<StudentListItem>>(`/students${toQuery(sp, ["q", "page", "pageSize", "sort", "status"])}`);
  // Akses ditolak: jangan tampilkan pencarian/filter yang tidak bisa dipakai.
  if (!res.ok && res.status === 403) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <ListToolbar
        basePath={BASE}
        searchParams={sp}
        searchLabel="Cari nama, NIS, atau NISN"
        filters={[{ name: "status", label: "Status", allLabel: "Semua status", options: toOptions(STUDENT_STATUS_LABELS) }]}
      />
      {!res.ok ? (
        <ApiErrorState status={res.status} error={res.error} />
      ) : res.data.total === 0 ? (
        <EmptyState
          title={sp.q || sp.status ? "Tidak ada siswa yang cocok" : "Belum ada data siswa"}
          description={sp.q || sp.status ? "Ubah kata kunci atau hapus filter." : "Tambahkan siswa satu per satu atau impor dari file CSV."}
        />
      ) : (
        <StudentsTable data={res.data.items} total={res.data.total} page={res.data.page} pageSize={res.data.pageSize} searchParams={{ ...sp, sort: sp.sort ?? "name" }} />
      )}
    </>
  );
}

export default function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  return (
    <>
      <PageHeader
        title="Siswa"
        description="Data induk siswa. Pencarian, filter, dan halaman tersimpan di URL."
        actions={
          <Suspense fallback={null}>
            <Actions />
          </Suspense>
        }
      />
      <Suspense fallback={<LoadingBlock />}>
        <StudentList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
