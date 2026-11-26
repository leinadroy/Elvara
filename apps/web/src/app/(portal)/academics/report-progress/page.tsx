import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Progres rapor" };

type Progress = {
  term: { id: string; name: string }; generatedAt: string;
  groups: { id: string; code: string; total: number; counts: Record<"DRAFT" | "RETURNED" | "SUBMITTED" | "PUBLISHED" | "NOT_STARTED", number> }[];
};

async function Content() {
  const result = await apiGet<Progress | null>("/report-cards/progress");
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data) return <EmptyState title="Belum ada semester berjalan" />;
  const { term, groups, generatedAt } = result.data;
  if (!groups.length) return <EmptyState title="Belum ada rombel" />;
  return <div className="grid gap-3">
    <p className="text-sm text-muted-foreground">{term.name} · status rapor peserta aktif tiap rombel · dihitung {formatDateTime(generatedAt)}</p>
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ id, code, total, counts }) => <li key={id}>
        <Link href={`/academics/report-progress/${id}?termId=${term.id}`} className="flex h-full flex-col gap-1 rounded-lg border bg-card p-4 hover:border-[var(--module)]">
          <span className="flex items-baseline justify-between gap-2"><span className="text-lg font-semibold">{code}</span><span className="text-sm tabular-nums text-muted-foreground">{counts.PUBLISHED}/{total} terbit</span></span>
          <span className="text-xs text-muted-foreground">{counts.SUBMITTED} diajukan · {counts.DRAFT} draf · {counts.RETURNED} dikembalikan · {counts.NOT_STARTED} belum dimulai</span>
        </Link>
      </li>)}
    </ul>
  </div>;
}

export default function ReportProgressPage() {
  return <>
    <PageHeader title="Progres rapor" description="Rapor setiap rombel untuk dibaca kurikulum dan pimpinan. Penyusunan oleh wali kelas; persetujuan oleh kepala sekolah." />
    <Suspense fallback={<LoadingBlock rows={4} />}><Content /></Suspense>
  </>;
}
