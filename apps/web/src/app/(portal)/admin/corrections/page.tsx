import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CORRECTION_STATUS_LABELS, type CorrectionStatus, type CorrectionView } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { ListToolbar } from "@/components/list-toolbar";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams, toQuery } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { toOptions } from "@/lib/ui";
import { ChangeList, ReviewActions } from "./review";

export const metadata: Metadata = { title: "Pengajuan koreksi" };
const BASE = "/admin/corrections";

async function Content({ searchParams }: PageProps<"/admin/corrections">) {
  const sp = flatParams(await searchParams);
  const status = (sp.status ?? "PENDING") as CorrectionStatus | "ALL";
  const res = await apiGet<CorrectionView[]>(`/corrections${toQuery({ status: status === "ALL" ? undefined : status }, ["status"])}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <ListToolbar
        basePath={BASE}
        searchParams={{ status: sp.status }}
        searchLabel="Status"
        hideSearch
        filters={[{ name: "status", label: "Status", allLabel: "Menunggu tinjauan", options: [{ value: "ALL", label: "Semua" }, ...toOptions(CORRECTION_STATUS_LABELS).filter((o) => o.value !== "PENDING")] }]}
      />
      {res.data.length === 0 ? (
        <EmptyState title={status === "PENDING" ? "Tidak ada pengajuan yang menunggu" : "Tidak ada pengajuan"} />
      ) : (
        <ul className="flex flex-col gap-3">
          {res.data.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {c.person.detailPath ? (
                    <Link href={c.person.detailPath} className="font-semibold hover:underline">
                      {c.person.fullName}
                    </Link>
                  ) : (
                    <span className="font-semibold">{c.person.fullName}</span>
                  )}
                  <Badge variant={c.status === "PENDING" ? "secondary" : c.status === "APPROVED" ? "default" : "outline"}>{CORRECTION_STATUS_LABELS[c.status]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(c.createdAt)} · {c.requestedBy}
                  </span>
                </div>
                <ChangeList changes={c.changes} />
                <p className="text-sm">
                  <span className="text-muted-foreground">Alasan:</span> {c.reason}
                </p>
                {c.reviewedBy && (
                  <p className="text-xs text-muted-foreground">
                    Ditinjau {c.reviewedBy} · {formatDateTime(c.reviewedAt)}
                    {c.reviewNote && ` · "${c.reviewNote}"`}
                  </p>
                )}
              </div>
              {c.status === "PENDING" && <ReviewActions id={c.id} name={c.person.fullName} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function CorrectionsPage(props: PageProps<"/admin/corrections">) {
  return (
    <>
      <PageHeader title="Pengajuan koreksi" description="Koreksi data diri yang diajukan siswa, pegawai, atau wali. Data resmi berubah setelah disetujui." />
      <Suspense fallback={<LoadingBlock />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
