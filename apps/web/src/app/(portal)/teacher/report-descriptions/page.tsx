import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { MyTeachingAssignment } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Deskripsi rapor" };

async function Content() {
  const res = await apiGet<MyTeachingAssignment[]>("/me/teaching-assignments");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (!res.data.length) return <EmptyState title="Belum ada penugasan mengajar" />;
  const terms = [...new Map(res.data.map((a) => [a.term.id, a.term])).values()];
  return (
    <>
      {terms.map((t) => (
        <section key={t.id} aria-label={t.name} className="flex flex-col gap-2">
          <h2 className="font-semibold">{t.name}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {res.data
              .filter((a) => a.term.id === t.id)
              .map((a) => (
                <li key={a.id}>
                  <Link href={`/teacher/report-descriptions/${a.id}`} className="flex h-full flex-col gap-1 rounded-2xl border bg-card p-4 hover:border-[var(--module)]">
                    <span className="text-lg font-semibold">
                      {a.classGroup.code} · {a.subject.name}
                    </span>
                    <span className="text-sm text-muted-foreground">Tulis capaian tertinggi dan yang perlu ditingkatkan</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export default function ReportDescriptionsPage() {
  return (
    <>
      <PageHeader title="Deskripsi rapor" description="Deskripsi capaian per siswa untuk mapel yang Anda ajar. Terkunci setelah rapor diajukan wali kelas." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content />
      </Suspense>
    </>
  );
}
