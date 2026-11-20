import type { Metadata } from "next";
import { Suspense } from "react";
import type { ImportBatchDetail } from "@smart-school/contracts";
import { ApiErrorState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { ImportRowsTable } from "../import-rows";

export const metadata: Metadata = { title: "Hasil impor" };

async function Content({ params }: { params: PageProps<"/admin/imports/[importId]">["params"] }) {
  const { importId } = await params;
  const res = await apiGet<ImportBatchDetail>(`/imports/${encodeURIComponent(importId)}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const b = res.data;
  return (
    <>
      <PageHeader
        title={b.fileName ?? "Impor siswa"}
        back={{ href: "/admin/imports", label: "Impor data" }}
        description={`${formatDateTime(b.createdAt)} · ${b.totalRows} baris · ${b.createdCount} dibuat · ${b.skippedCount} dilewati · ${b.errorCount} bermasalah`}
      />
      <ImportRowsTable rows={b.rows} />
    </>
  );
}

export default function ImportDetailPage({ params }: PageProps<"/admin/imports/[importId]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Content params={params} />
    </Suspense>
  );
}
