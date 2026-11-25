import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalActivityList } from "@/components/activities/portal-activities";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Tugas anak" };

async function Content({ searchParams }: PageProps<"/guardian/assignments">) {
  const { children, chosen } = await resolveChild(flatParams(await searchParams).studentId);
  return (
    <>
      <PageHeader title={chosen ? `Tugas ${chosen.fullName}` : "Tugas anak"} />
      <ChildTabs basePath="/guardian/assignments" items={children} chosenId={chosen?.studentId ?? null} />
      {chosen && <PortalActivityList studentId={chosen.studentId} detailBase="/guardian/assignments" />}
    </>
  );
}

export default function GuardianAssignmentsPage(props: PageProps<"/guardian/assignments">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content {...props} />
    </Suspense>
  );
}
