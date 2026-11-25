import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { ReportCardOverviewView } from "@/components/report-cards/views";

export const metadata: Metadata = { title: "Rapor" };

export default function ReportCardsPage() {
  return (
    <>
      <PageHeader title="Rapor" description="Progres rapor setiap rombel. Kepala sekolah menyetujui atau mengembalikan rapor yang diajukan wali kelas." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <ReportCardOverviewView base="/academics/report-cards" />
      </Suspense>
    </>
  );
}
