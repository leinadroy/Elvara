import type { Metadata } from "next";
import { Suspense } from "react";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { PortalGradesView } from "@/components/grades/portal-grades";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Nilai anak" };

async function Content({ searchParams }: PageProps<"/guardian/grades">) {
  const { children, chosen } = await resolveChild(flatParams(await searchParams).studentId);
  return (
    <>
      <PageHeader title={chosen ? `Nilai ${chosen.fullName}` : "Nilai anak"} />
      <ChildTabs basePath="/guardian/grades" items={children} chosenId={chosen?.studentId ?? null} />
      {chosen && <PortalGradesView studentId={chosen.studentId} />}
    </>
  );
}

export default function GuardianGradesPage(props: PageProps<"/guardian/grades">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content {...props} />
    </Suspense>
  );
}
