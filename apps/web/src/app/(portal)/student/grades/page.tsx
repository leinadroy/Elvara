import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalGrades } from "@/components/grading/portal-grades";
import { LoadingBlock, PageHeader } from "@/components/page-states";

export const metadata: Metadata = { title: "Nilai saya" };

export default function StudentGradesPage() {
  return <><PageHeader title="Nilai saya" /><Suspense fallback={<LoadingBlock rows={4} />}><PortalGrades /></Suspense></>;
}
