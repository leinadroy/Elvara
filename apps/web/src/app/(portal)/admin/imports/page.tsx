import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { ImportBatchSummary } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { ImportStudentsForm } from "./import-form";

export const metadata: Metadata = { title: "Impor data" };

async function History() {
  const res = await apiGet<ImportBatchSummary[]>("/imports");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (res.data.length === 0) return <EmptyState title="Belum ada riwayat impor" />;
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {res.data.map((b) => (
        <li key={b.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/admin/imports/${b.id}`} className="font-medium hover:underline">
              {b.fileName ?? "Impor siswa"}
            </Link>
            <p className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</p>
          </div>
          <p className="text-xs">
            {b.totalRows} baris · {b.createdCount} dibuat · {b.skippedCount} dilewati · <span className={b.errorCount ? "text-destructive" : ""}>{b.errorCount} bermasalah</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function ImportsPage() {
  return (
    <>
      <PageHeader title="Impor data siswa" description="Unggah file CSV atau Excel (.xlsx). Mengunggah file yang sama dua kali tidak membuat data ganda." />
      <ImportStudentsForm />
      <section aria-labelledby="riwayat" className="flex flex-col gap-3">
        <h2 id="riwayat" className="text-lg font-semibold">
          Riwayat impor
        </h2>
        <Suspense fallback={<LoadingBlock rows={3} />}>
          <History />
        </Suspense>
      </section>
    </>
  );
}
