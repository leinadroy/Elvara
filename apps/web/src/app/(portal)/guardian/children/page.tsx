import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GUARDIAN_RELATIONSHIP_LABELS, STUDENT_STATUS_LABELS, type ChildSummary } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Anak saya" };

async function Content() {
  const res = await apiGet<ChildSummary[]>("/guardian/children");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (res.data.length === 0) {
    return <EmptyState title="Belum ada anak yang terhubung" description="Hubungan wali–anak muncul di sini setelah sekolah menautkan dan Anda memverifikasi undangannya." />;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {res.data.map((c) => (
        <li key={c.studentId}>
          <Link href={`/guardian/children/${c.studentId}`} className="block rounded-xl p-4 ring-1 ring-foreground/10 hover:bg-muted">
            <p className="text-lg font-medium">{c.fullName}</p>
            <p className="text-sm text-muted-foreground">
              NIS {c.nis} · {GUARDIAN_RELATIONSHIP_LABELS[c.relationship]}
            </p>
            <Badge className="mt-2" variant={c.status === "ACTIVE" ? "default" : "secondary"}>
              {STUDENT_STATUS_LABELS[c.status]}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function GuardianChildrenPage() {
  return (
    <>
      <PageHeader title="Anak saya" description="Hanya anak dengan hubungan wali yang sudah terverifikasi yang ditampilkan." />
      <Suspense fallback={<LoadingBlock rows={2} />}>
        <Content />
      </Suspense>
    </>
  );
}
