import { Suspense } from "react";
import { PortalReports } from "@/components/grading/portal-reports";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export default function StudentReportsPage() {
  return <><PageHeader title="Rapor saya" /><Suspense fallback={<LoadingBlock rows={3} />}><PortalReports /></Suspense></>;
}
