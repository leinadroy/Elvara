import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/page-states";
import { ReportCardClassView } from "@/components/report-cards/views";

export const metadata: Metadata = { title: "Rapor rombel" };

async function Content({ params }: PageProps<"/teacher/report-cards/[classGroupId]">) {
  const { classGroupId } = await params;
  return <ReportCardClassView base="/teacher/report-cards" classGroupId={classGroupId} />;
}

export default function ReportCardClassPage(props: PageProps<"/teacher/report-cards/[classGroupId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <Content {...props} />
    </Suspense>
  );
}
