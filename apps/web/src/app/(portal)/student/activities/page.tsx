import { Suspense } from "react";
import { PortalActivities } from "@/components/grading/portal-activities";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export default function StudentActivitiesPage() {
  return <><PageHeader title="Tugas saya" /><Suspense fallback={<LoadingBlock rows={4} />}><PortalActivities /></Suspense></>;
}
