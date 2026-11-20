import type { Metadata } from "next";
import { Suspense } from "react";
import { GUARDIAN_RELATIONSHIP_LABELS, STUDENT_STATUS_LABELS, type ChildSummary } from "@smart-school/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorState, DefinitionList, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Data anak" };

async function Content({ params }: { params: PageProps<"/guardian/children/[studentId]">["params"] }) {
  const { studentId } = await params;
  const res = await apiGet<ChildSummary>(`/guardian/children/${encodeURIComponent(studentId)}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const c = res.data;
  return (
    <>
      <PageHeader title={c.fullName} back={{ href: "/guardian/children", label: "Anak saya" }} description={`Anda tercatat sebagai ${GUARDIAN_RELATIONSHIP_LABELS[c.relationship].toLowerCase()}.`} />
      <Card>
        <CardHeader>
          <CardTitle>Data siswa</CardTitle>
        </CardHeader>
        <CardContent>
          <DefinitionList
            items={[
              { label: "NIS", value: c.nis },
              { label: "Status", value: STUDENT_STATUS_LABELS[c.status] },
              { label: "Hak lihat akademik", value: c.canViewAcademic ? "Ya" : "Tidak" },
              { label: "Hak lihat kehadiran", value: c.canViewAttendance ? "Ya" : "Tidak" },
            ]}
          />
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Jadwal, kehadiran, dan pengumuman kelas akan tampil di sini pada rilis berikutnya.</p>
    </>
  );
}

export default function GuardianChildPage({ params }: PageProps<"/guardian/children/[studentId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content params={params} />
    </Suspense>
  );
}
