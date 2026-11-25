import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { PortalReportCardsView } from "@/components/report-cards/views";

export const metadata: Metadata = { title: "Rapor saya" };

export default function StudentReportCardsPage() {
  return (
    <>
      <PageHeader title="Rapor saya" />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <PortalReportCardsView />
      </Suspense>
    </>
  );
}
