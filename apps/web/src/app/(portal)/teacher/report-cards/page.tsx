import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { ReportCardOverviewView } from "@/components/report-cards/views";

export const metadata: Metadata = { title: "Rapor rombel binaan" };

export default function ReportCardsPage() {
  return (
    <>
      <PageHeader title="Rapor rombel binaan" description="Rapor siswa rombel tempat Anda menjadi wali kelas: periksa masalah, isi catatan, lalu ajukan ke kepala sekolah." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <ReportCardOverviewView base="/teacher/report-cards" />
      </Suspense>
    </>
  );
}
