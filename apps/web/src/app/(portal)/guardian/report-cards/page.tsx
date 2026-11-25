import type { Metadata } from "next";
import { Suspense } from "react";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { PortalReportCardsView } from "@/components/report-cards/views";
import { flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Rapor anak" };

async function Content({ searchParams }: PageProps<"/guardian/report-cards">) {
  const { children, chosen } = await resolveChild(flatParams(await searchParams).studentId);
  return (
    <>
      <PageHeader title={chosen ? `Rapor ${chosen.fullName}` : "Rapor anak"} />
      <ChildTabs basePath="/guardian/report-cards" items={children} chosenId={chosen?.studentId ?? null} />
      {chosen && <PortalReportCardsView studentId={chosen.studentId} />}
    </>
  );
}

export default function GuardianReportCardsPage(props: PageProps<"/guardian/report-cards">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content {...props} />
    </Suspense>
  );
}
