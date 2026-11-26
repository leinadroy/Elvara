import Link from "next/link";
import { Suspense } from "react";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { ReopenReport } from "./[reportId]/review-actions";

type QueueItem = {
  id: string;
  submittedAt: string | null;
  decidedAt: string | null;
  currentVersionNo: number;
  student: { nis: string; person: { fullName: string } };
  term: { name: string };
  classGroup: { code: string };
};

const base = "/academics/report-review";

async function Queue({ searchParams }: PageProps<"/academics/report-review">) {
  const published = flatParams(await searchParams).status === "published";
  const result = await apiGet<QueueItem[]>(`/report-cards/review-queue?status=${published ? "PUBLISHED" : "SUBMITTED"}`);
  return <div className="grid gap-3">
    <nav aria-label="Status rapor" className="flex flex-wrap gap-4 text-sm">
      <Link className="text-primary underline" href={base} aria-current={!published ? "page" : undefined}>Menunggu persetujuan</Link>
      <Link className="text-primary underline" href={`${base}?status=published`} aria-current={published ? "page" : undefined}>Sudah terbit</Link>
    </nav>
    {!result.ok ? <ApiErrorState status={result.status} error={result.error} />
      : !result.data.length ? <EmptyState title={published ? "Belum ada rapor terbit" : "Tidak ada rapor menunggu persetujuan"} />
      : <ul className="divide-y rounded-lg border bg-card">
    {result.data.map((report) => (
      <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
        <div>
          {published ? <p className="font-medium">{report.student.person.fullName}</p>
            : <Link className="font-medium text-primary hover:underline" href={`${base}/${report.id}`}>{report.student.person.fullName}</Link>}
          <p className="text-muted-foreground">NIS {report.student.nis} · {report.classGroup.code} · {report.term.name}</p>
        </div>
        <span className="text-muted-foreground">{published ? `Versi ${report.currentVersionNo} · ${formatDateTime(report.decidedAt)}` : formatDateTime(report.submittedAt)}</span>
        {published && <details className="w-full">
          <summary className="cursor-pointer text-primary">Mulai revisi</summary>
          <div className="mt-2"><ReopenReport id={report.id} /></div>
        </details>}
      </li>
    ))}
  </ul>}
  </div>;
}

export default function ReportReviewQueuePage(props: PageProps<"/academics/report-review">) {
  return <><PageHeader title="Peninjauan rapor" /><Suspense fallback={<LoadingBlock rows={4} />}><Queue {...props} /></Suspense></>;
}
