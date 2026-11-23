import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { NotificationView } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notifikasi" };

async function Content() {
  const res = await apiGet<{ items: NotificationView[]; unread: number }>("/notifications");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const { items, unread } = res.data;
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{unread ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p>
        {unread > 0 && <ActionButton path="/notifications/read-all" label="Tandai semua dibaca" />}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Belum ada notifikasi" description="Notifikasi muncul untuk pengumuman baru dan, bagi orang tua/wali, catatan alpa anak." />
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {items.map((n) => (
            <li key={n.id} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-start sm:gap-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={n.readAt ? "" : "font-semibold"}>
                  {!n.readAt && <span className="sr-only">Belum dibaca: </span>}
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </div>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {formatDateTime(n.createdAt)}
                {!n.readAt && <ActionButton path={`/notifications/${n.id}/read`} label="Dibaca" variant="ghost" size="xs" />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifikasi" description="Notifikasi dalam aplikasi. Terkirim belum tentu dibaca; tanda baca tercatat per pengguna." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content />
      </Suspense>
    </>
  );
}
