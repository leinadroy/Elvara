import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ATTENDANCE_STATUS_LABELS, type AttendanceCorrectionView } from "@smart-school/contracts";
import { AttendanceBadge } from "@/components/attendance/status";
import { ListToolbar } from "@/components/list-toolbar";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams, toQuery } from "@/lib/api-server";
import { formatDate, formatDateTime } from "@/lib/format";
import { DecideButtons } from "./decide";

export const metadata: Metadata = { title: "Koreksi absensi" };
const BASE = "/teacher/attendance/corrections";
const DECISION_LABELS = { PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak" } as const;

async function Content({ searchParams }: PageProps<"/teacher/attendance/corrections">) {
  const sp = flatParams(await searchParams);
  const decision = sp.decision ?? "PENDING";
  const res = await apiGet<AttendanceCorrectionView[]>(`/attendance/corrections${toQuery({ decision: decision === "ALL" ? undefined : decision }, ["decision"])}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <ListToolbar
        basePath={BASE}
        searchParams={{ decision: sp.decision }}
        searchLabel="Status"
        hideSearch
        filters={[{ name: "decision", label: "Status", allLabel: "Menunggu", options: [{ value: "ALL", label: "Semua" }, { value: "APPROVED", label: "Disetujui" }, { value: "REJECTED", label: "Ditolak" }] }]}
      />
      {res.data.length === 0 ? (
        <EmptyState title={decision === "PENDING" ? "Tidak ada koreksi yang menunggu" : "Tidak ada koreksi"} description="Koreksi muncul di sini bila catatan absensi perlu diubah setelah hari sesi." />
      ) : (
        <ul className="flex flex-col gap-3">
          {res.data.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                <p>
                  <span className="font-semibold">{c.student.fullName}</span> <span className="text-xs text-muted-foreground">NIS {c.student.nis}</span> ·{" "}
                  <Link href={`/teacher/attendance/sessions/${c.sessionId}`} className="underline">
                    {c.classGroup.code}
                    {c.subject && ` · ${c.subject}`} · {formatDate(c.date)}
                  </Link>
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <AttendanceBadge status={c.oldStatus} /> <span aria-hidden="true">→</span>
                  <span className="sr-only">diubah menjadi</span>
                  <AttendanceBadge status={c.proposedStatus} />
                  <span className="text-xs text-muted-foreground">({DECISION_LABELS[c.decision]})</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Alasan:</span> {c.reason}
                </p>
                <p className="text-xs text-muted-foreground">
                  Diajukan {c.requestedBy ?? "—"} · {formatDateTime(c.createdAt)}
                  {c.decidedBy && ` · Diputuskan ${c.decidedBy}`}
                  {c.decisionNote && ` · "${c.decisionNote}"`}
                </p>
              </div>
              {c.decision === "PENDING" && <DecideButtons id={c.id} label={`${c.student.fullName}: ${ATTENDANCE_STATUS_LABELS[c.proposedStatus]}`} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AttendanceCorrectionsPage(props: PageProps<"/teacher/attendance/corrections">) {
  return (
    <>
      <PageHeader title="Koreksi absensi" description="Wali kelas memutuskan koreksi untuk rombel binaannya; admin untuk semua rombel. Koreksi yang Anda ajukan sendiri diputuskan admin." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
