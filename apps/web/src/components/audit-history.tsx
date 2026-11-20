import type { AuditEventView, Paginated } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

const LABELS: Record<string, string> = {
  "student.create": "Data siswa dibuat",
  "student.update": "Data siswa diubah",
  "employee.create": "Data pegawai dibuat",
  "employee.update": "Data pegawai diubah",
  "guardian_link.create": "Wali ditautkan",
  "guardian_link.revoke": "Hak wali dicabut",
  "invitation.create": "Undangan dibuat",
  "invitation.accept": "Undangan diterima",
  "document.upload": "Dokumen diunggah",
  "document.download": "Dokumen diunduh",
  "document.delete": "Dokumen dihapus",
  "correction.request": "Koreksi diajukan",
  "correction.approve": "Koreksi disetujui",
  "correction.reject": "Koreksi ditolak",
  "correction.cancel": "Koreksi dibatalkan",
};

/** Riwayat perubahan sebuah objek dari log audit (hanya untuk peran yang boleh membaca audit). */
export async function AuditHistory({ targets }: { targets: { entityType: string; entityId: string }[] }) {
  const results = await Promise.all(
    targets.map((t) => apiGet<Paginated<AuditEventView>>(`/audit-events?entityType=${t.entityType}&entityId=${t.entityId}&pageSize=50`)),
  );
  const failed = results.find((r) => !r.ok);
  if (failed && !failed.ok) return <ApiErrorState status={failed.status} error={failed.error} />;
  const events = results
    .flatMap((r) => (r.ok ? r.data.items : []))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!events.length) return <EmptyState title="Belum ada riwayat" />;
  return (
    <ol className="relative flex flex-col gap-3 border-l-2 border-[var(--module-tint)] pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span aria-hidden="true" className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-[var(--module)]" />
          <p className="text-sm font-medium">{LABELS[e.action] ?? e.action}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(e.createdAt)} · {e.actor?.email ?? "Sistem"}
          </p>
        </li>
      ))}
    </ol>
  );
}
