import { Suspense } from "react";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { PortalActivities } from "@/components/grading/portal-activities";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

async function Activities({ searchParams }: PageProps<"/guardian/activities">) {
  const requested = flatParams(await searchParams).studentId;
  const { children, chosen } = await resolveChild(requested);
  const studentId = requested ?? chosen?.studentId;
  return <>
    <ChildTabs basePath="/guardian/activities" items={children} chosenId={studentId ?? null} />
    {studentId && <PortalActivities studentId={studentId} />}
  </>;
}

export default function GuardianActivitiesPage(props: PageProps<"/guardian/activities">) {
  return <><PageHeader title="Tugas anak" /><Suspense fallback={<LoadingBlock rows={4} />}><Activities {...props} /></Suspense></>;
}
