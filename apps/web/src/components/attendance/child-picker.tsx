import Link from "next/link";
import type { DashboardSummary } from "@smart-school/contracts";
import { EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";

/** Anak yang terhubung (hubungan terverifikasi) dan anak terpilih untuk halaman wali. */
export async function resolveChild(studentId: string | undefined) {
  const res = await apiGet<DashboardSummary>("/dashboard/summary");
  const children = res.ok ? (res.data.children ?? []) : [];
  const chosen = children.find((c) => c.studentId === studentId) ?? children[0] ?? null;
  return { children, chosen };
}

export function ChildTabs({ basePath, items, chosenId }: { basePath: string; items: { studentId: string; fullName: string }[]; chosenId: string | null }) {
  if (!items.length) return <EmptyState title="Belum ada anak terhubung" description="Hubungan wali perlu diverifikasi sekolah sebelum data anak bisa dilihat." />;
  if (items.length < 2) return null;
  return (
    <nav aria-label="Pilih anak" className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <Link
          key={c.studentId}
          href={`${basePath}?studentId=${c.studentId}`}
          aria-current={c.studentId === chosenId ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-sm ${c.studentId === chosenId ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {c.fullName}
        </Link>
      ))}
    </nav>
  );
}
