import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import type { WorkShiftOptions, WorkShiftView } from "@smart-school/contracts";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { ShiftList } from "@/components/staff/shift-list";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { CancelShift, NewShiftForm } from "./forms";

export const metadata: Metadata = { title: "Jadwal tugas staf" };
const BASE = "/admin/staff-schedule";

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function Content({ searchParams }: PageProps<"/admin/staff-schedule">) {
  await connection();
  const sp = flatParams(await searchParams);
  const me = await getMe();
  const canManage = me.permissions.includes("work-shifts:manage");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const from = sp.from ?? today;
  const to = sp.to ?? shift(from, 6);
  const [res, options] = await Promise.all([
    apiGet<WorkShiftView[]>(`/work-shifts?from=${from}&to=${to}${sp.employeeId ? `&employeeId=${sp.employeeId}` : ""}`),
    canManage ? apiGet<WorkShiftOptions>("/work-shifts/options") : Promise.resolve(null),
  ]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const employees = options?.ok ? options.data.employees.map((e) => ({ value: e.id, label: `${e.fullName} · ${e.position}` })) : [];
  return (
    <>
      <Picker
        action={BASE}
        fields={[
          { name: "from", label: "Dari", value: from, options: [], type: "date" },
          { name: "to", label: "Sampai", value: to, options: [], type: "date" },
          ...(employees.length ? [{ name: "employeeId", label: "Pegawai", value: sp.employeeId, options: employees, placeholder: "Semua pegawai" }] : []),
        ]}
      />
      {res.data.length ? (
        <ShiftList items={res.data} showEmployee today={today} action={canManage ? (s) => (s.status === "SCHEDULED" ? <CancelShift id={s.id} title={s.title} /> : null) : undefined} />
      ) : (
        <EmptyState title="Belum ada tugas pada rentang ini" description={canManage ? "Tambahkan tugas di bawah." : undefined} />
      )}
      {canManage && options?.ok && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Tugas baru</h2>
          <NewShiftForm employees={employees} rooms={options.data.rooms.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }))} today={today} />
        </section>
      )}
    </>
  );
}

export default function StaffSchedulePage(props: PageProps<"/admin/staff-schedule">) {
  return (
    <>
      <PageHeader title="Jadwal tugas staf" description="Tugas pegawai per tanggal dan lokasi. Tugas yang bentrok untuk pegawai yang sama ditolak; tugas dibatalkan, tidak dihapus." />
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
