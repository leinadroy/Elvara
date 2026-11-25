import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/page-states";
import { ReportCardDetailView } from "@/components/report-cards/views";

export const metadata: Metadata = { title: "Rapor siswa" };

async function Content({ params }: PageProps<"/teacher/report-cards/card/[id]">) {
  const { id } = await params;
  return <ReportCardDetailView id={id} base="/teacher/report-cards" />;
}

export default function ReportCardPage(props: PageProps<"/teacher/report-cards/card/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <Content {...props} />
    </Suspense>
  );
}
