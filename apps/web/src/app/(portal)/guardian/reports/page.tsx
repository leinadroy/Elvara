import { Suspense } from "react";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { PortalReports } from "@/components/grading/portal-reports";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

async function Reports({ searchParams }: PageProps<"/guardian/reports">) {
  const requested = flatParams(await searchParams).studentId;
  const { children, chosen } = await resolveChild(requested);
  const studentId = requested ?? chosen?.studentId;
  return <>
    <ChildTabs basePath="/guardian/reports" items={children} chosenId={studentId ?? null} />
    {studentId && <PortalReports studentId={studentId} />}
  </>;
}

export default function GuardianReportsPage(props: PageProps<"/guardian/reports">) {
  return <><PageHeader title="Rapor anak" /><Suspense fallback={<LoadingBlock rows={3} />}><Reports {...props} /></Suspense></>;
}
