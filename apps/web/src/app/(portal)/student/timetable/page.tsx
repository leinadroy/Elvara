import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassTimetableView } from "@/components/attendance/personal-attendance";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export const metadata: Metadata = { title: "Jadwal saya" };

export default function StudentJadwalPage() {
  return (
    <>
      <PageHeader title="Jadwal saya" />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <ClassTimetableView />
      </Suspense>
    </>
  );
}
