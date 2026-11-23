import type { Metadata } from "next";
import { Suspense } from "react";
import type { WorkShiftView } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { ShiftList } from "@/components/staff/shift-list";
import { apiGet } from "@/lib/api-server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Jadwal tugas saya" };

async function Content() {
  const res = await apiGet<{ from: string; to: string; items: WorkShiftView[] }>("/me/work-shifts");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const { from, to, items } = res.data;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {formatDate(from)} – {formatDate(to)}
      </p>
      {items.length ? <ShiftList items={items} showEmployee={false} today={from} /> : <EmptyState title="Tidak ada tugas terjadwal" description="Jadwal tugas diisi oleh tata usaha. Hubungi admin bila ada tugas yang belum tercatat." />}
    </>
  );
}

export default function MySchedulePage() {
  return (
    <>
      <PageHeader title="Jadwal tugas saya" />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content />
      </Suspense>
    </>
  );
}
