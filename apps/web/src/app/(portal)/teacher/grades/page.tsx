import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { MyTeachingAssignment } from "@smart-school/contracts";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Buku nilai saya" };

async function Content() {
  const res = await apiGet<MyTeachingAssignment[]>("/me/teaching-assignments");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (!res.data.length) return <EmptyState title="Belum ada penugasan mengajar" description="Penugasan diatur bagian kurikulum di Pengaturan akademik." />;
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
                  <Link href={`/teacher/grades/${a.id}`} className="flex h-full flex-col gap-1 rounded-2xl border bg-card p-4 hover:border-[var(--module)]">
                    <span className="text-lg font-semibold">
                      {a.classGroup.code} · {a.subject.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {a.assessments} penilaian{a.unpublished ? ` · ${a.unpublished} belum terbit` : ""}
                    </span>
                    {!a.hasScheme && <span className="text-xs font-medium text-primary">Skema nilai belum terbit</span>}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export default function MyGradesPage() {
  return (
    <>
      <PageHeader title="Buku nilai saya" description="Penilaian dan nilai untuk kelas yang Anda ajar." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content />
      </Suspense>
    </>
  );
}
