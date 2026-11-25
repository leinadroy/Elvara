import type { Metadata } from "next";
import { Suspense } from "react";
import type { ReportDescriptions } from "@smart-school/contracts";
import { ApiErrorState, LoadingBlock, PageHeader } from "@/components/page-states";
import { DescriptionEditor } from "@/components/report-cards/description-editor";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Deskripsi rapor" };

async function Content({ params }: PageProps<"/teacher/report-descriptions/[assignmentId]">) {
  const { assignmentId } = await params;
  const res = await apiGet<ReportDescriptions>(`/report-cards/descriptions?teachingAssignmentId=${assignmentId}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const a = res.data.assignment;
  return (
    <>
      <PageHeader
        title={`Deskripsi rapor ${a.subject.name} ${a.classGroup.code}`}
        description={`${a.term.name}. Nilai akhir dihitung dari penilaian terbit.`}
        back={{ href: "/teacher/report-descriptions", label: "Deskripsi rapor" }}
      />
      <DescriptionEditor data={res.data} />
    </>
  );
}

export default function ReportDescriptionPage(props: PageProps<"/teacher/report-descriptions/[assignmentId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <Content {...props} />
    </Suspense>
  );
}
