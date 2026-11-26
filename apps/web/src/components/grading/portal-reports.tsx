import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

type ReportVersion = {
  id: string;
  versionNo: number;
  publishedAt: string;
  reportCard: { term: { name: string; academicYear: { name: string } } };
};

export async function PortalReports({ studentId }: { studentId?: string }) {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  const result = await apiGet<ReportVersion[]>(`/report-cards/portal${query}`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.length) return <EmptyState title="Belum ada rapor terbit" />;
  return (
    <ul className="mt-4 divide-y rounded-lg border bg-card">
      {result.data.map((version) => (
        <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-medium">{version.reportCard.term.name} · {version.reportCard.term.academicYear.name}</p>
            <p className="mt-1 text-muted-foreground">Versi {version.versionNo} · {formatDateTime(version.publishedAt)}</p>
          </div>
          <a className="text-primary underline" href={`/api/v1/report-cards/portal/${version.id}/file${query}`}>
            Unduh PDF<span className="sr-only"> versi {version.versionNo}, {version.reportCard.term.name}, {version.reportCard.term.academicYear.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
