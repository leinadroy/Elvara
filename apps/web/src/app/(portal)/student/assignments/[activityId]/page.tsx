import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalActivityDetail } from "@/components/activities/portal-activities";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export const metadata: Metadata = { title: "Tugas" };

async function Content({ params }: PageProps<"/student/assignments/[activityId]">) {
  const { activityId } = await params;
  return <PortalActivityDetail id={activityId} canSubmitAsStudent />;
}

export default function StudentAssignmentPage(props: PageProps<"/student/assignments/[activityId]">) {
  return (
    <>
      <PageHeader title="Tugas" back={{ href: "/student/assignments", label: "Tugas saya" }} />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
