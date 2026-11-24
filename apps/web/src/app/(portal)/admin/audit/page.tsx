import type { Metadata } from "next";
import { Suspense } from "react";
import type { AuditEventView, Paginated } from "@smart-school/contracts";
import { Picker } from "@/components/academics/picker";
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
  { value: "class_group.", label: "Rombel" },
  { value: "enrollment.", label: "Penempatan siswa" },
  { value: "homeroom.", label: "Wali kelas" },
  { value: "teaching_assignment.", label: "Penugasan guru" },
  { value: "timetable.", label: "Jadwal pelajaran" },
  { value: "attendance.", label: "Absensi" },
  { value: "announcement.", label: "Pengumuman" },
  { value: "work_shift.", label: "Jadwal tugas staf" },
] as const;

const ENTITY_TYPES = [
  ["user", "Akun"],
  ["person", "Data diri"],
  ["student", "Siswa"],
  ["employee", "Pegawai"],
  ["guardian", "Wali"],
  ["academic_year", "Tahun ajaran"],
  ["class_group", "Rombel"],
  ["teaching_assignment", "Penugasan guru"],
  ["timetable_version", "Versi jadwal"],
  ["schedule_exception", "Perubahan pertemuan"],
  ["student_attendance_session", "Sesi absensi"],
  ["attendance_correction", "Koreksi absensi"],
  ["announcement", "Pengumuman"],
  ["work_shift", "Tugas staf"],
  ["import_batch", "Impor"],
].map(([value, label]) => ({ value: value!, label: label! }));

async function Content({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  const sp = flatParams(await searchParams);
  const query = toQuery({ ...sp, action: sp.action ?? sp.q }, ["page", "pageSize", "action", "entityType", "entityId", "actor", "from", "to"]);
  const res = await apiGet<Paginated<AuditEventView>>(`/audit-events${query}`);
  // Akses ditolak: jangan tampilkan pencarian/filter yang tidak bisa dipakai.
  if (!res.ok && res.status === 403) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      {/* FR-9.3: cari per objek (jenis + id dari halaman detail), pelaku, dan periode. */}
      <Picker
        action={BASE}
        keep={{ entityId: sp.entityId }}
        submitLabel="Terapkan"
        fields={[
          { name: "action", label: "Kelompok aksi", value: sp.action, options: [...ACTION_GROUPS], placeholder: "Semua aksi" },
          { name: "entityType", label: "Jenis objek", value: sp.entityType, options: ENTITY_TYPES, placeholder: "Semua objek" },
          { name: "actor", label: "Pelaku (email)", value: sp.actor, options: [], type: "text", placeholder: "mis. guru@" },
          { name: "from", label: "Dari", value: sp.from, options: [], type: "date" },
          { name: "to", label: "Sampai", value: sp.to, options: [], type: "date" },
        ]}
      />
      {sp.entityId && (
        <p className="text-xs text-muted-foreground">
          Hanya objek <code>{sp.entityId}</code>. <a href={BASE} className="underline">Hapus semua filter</a>
        </p>
      )}
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
