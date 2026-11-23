import type { Metadata } from "next";
import { Suspense } from "react";
import { PersonalAttendanceView } from "@/components/attendance/personal-attendance";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export const metadata: Metadata = { title: "Kehadiran saya" };

export default function StudentKehadiranPage() {
  return (
    <>
      <PageHeader title="Kehadiran saya" />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <PersonalAttendanceView />
      </Suspense>
    </>
  );
}
