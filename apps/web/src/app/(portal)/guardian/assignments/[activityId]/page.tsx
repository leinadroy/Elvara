import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalActivityDetail } from "@/components/activities/portal-activities";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Tugas anak" };

async function Content({ params, searchParams }: PageProps<"/guardian/assignments/[activityId]">) {
  const { activityId } = await params;
  const studentId = flatParams(await searchParams).studentId;
  return (
    <>
      <PageHeader title="Tugas anak" back={{ href: `/guardian/assignments${studentId ? `?studentId=${studentId}` : ""}`, label: "Daftar tugas" }} />
      <PortalActivityDetail id={activityId} studentId={studentId} canSubmitAsStudent={false} />
    </>
  );
}

export default function GuardianAssignmentPage(props: PageProps<"/guardian/assignments/[activityId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content {...props} />
    </Suspense>
  );
}
