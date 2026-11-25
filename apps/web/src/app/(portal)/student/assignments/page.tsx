import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalActivityList } from "@/components/activities/portal-activities";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export const metadata: Metadata = { title: "Tugas saya" };

export default function StudentAssignmentsPage() {
  return (
    <>
      <PageHeader title="Tugas saya" />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <PortalActivityList detailBase="/student/assignments" />
      </Suspense>
    </>
  );
}
