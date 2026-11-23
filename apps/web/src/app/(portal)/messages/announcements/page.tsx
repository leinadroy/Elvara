import type { Metadata } from "next";
import { Suspense } from "react";
import { AUDIENCE_LABELS, ROLE_LABELS, type AnnouncementView, type BuildingView, type ClassGroupListItem } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, getMe } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { ComposeAnnouncement, MarkRead } from "./compose";

export const metadata: Metadata = { title: "Pengumuman" };

const STATUS_LABELS = { SCHEDULED: "Terjadwal", PUBLISHED: "Terbit", WITHDRAWN: "Ditarik" } as const;

function Item({ a, manage }: { a: AnnouncementView; manage: boolean }) {
  return (
    <li id={a.id} className="scroll-mt-20 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{a.title}</h2>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(a.publishAt)} · {a.author ?? "Sekolah"} · {a.audienceKind === "CLASS_GROUP" && a.classGroup
              ? `Rombel ${a.classGroup.code}`
              : a.audienceKind === "BUILDING" && a.building
                ? `Gedung ${a.building.name}`
                : a.audienceKind === "ROLE" && a.audienceRole
                  ? `Peran ${ROLE_LABELS[a.audienceRole]}`
                  : AUDIENCE_LABELS[a.audienceKind]}
          </p>
        </div>
        {manage ? (
          <span className="flex items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${a.status === "PUBLISHED" ? "bg-secondary" : a.status === "SCHEDULED" ? "border border-[var(--module)]" : "bg-muted text-muted-foreground"}`}>{STATUS_LABELS[a.status]}</span>
            {a.status !== "WITHDRAWN" && <ActionButton path={`/announcements/${a.id}/withdraw`} label="Tarik" confirm="Tarik pengumuman ini? Penerima tidak akan melihatnya lagi." />}
          </span>
        ) : (
          <MarkRead id={a.id} />
        )}
      </div>
      <p className="mt-2 text-sm whitespace-pre-line">{a.body}</p>
    </li>
  );
}

async function Content() {
  const me = await getMe();
  const canPublish = me.permissions.includes("announcements:publish");
  const [feed, managed, classes, buildings] = await Promise.all([
    apiGet<AnnouncementView[]>("/announcements"),
    canPublish ? apiGet<AnnouncementView[]>("/announcements/manage") : Promise.resolve(null),
    canPublish && me.permissions.includes("classes:read") ? apiGet<ClassGroupListItem[]>("/class-groups") : Promise.resolve(null),
    canPublish && me.permissions.includes("school:read") ? apiGet<BuildingView[]>("/buildings") : Promise.resolve(null),
  ]);
  if (!feed.ok) return <ApiErrorState status={feed.status} error={feed.error} />;
  return (
    <>
      {canPublish && (
        <section aria-label="Buat pengumuman" className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Buat pengumuman</h2>
          <ComposeAnnouncement classes={classes?.ok ? classes.data.map((c) => ({ value: c.id, label: c.code })) : []} buildings={buildings?.ok ? buildings.data.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` })) : []} />
        </section>
      )}
      <section aria-label="Untuk Anda" className="flex flex-col gap-2">
        <h2 className="font-semibold">Untuk Anda</h2>
        {feed.data.length ? (
          <ul className="flex flex-col gap-2">
            {feed.data.map((a) => (
              <Item key={a.id} a={a} manage={false} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada pengumuman untuk Anda" />
        )}
      </section>
      {managed?.ok && managed.data.length > 0 && (
        <section aria-label="Semua pengumuman sekolah" className="flex flex-col gap-2">
          <h2 className="font-semibold">Semua pengumuman sekolah</h2>
          <ul className="flex flex-col gap-2">
            {managed.data.map((a) => (
              <Item key={a.id} a={a} manage />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function AnnouncementsPage() {
  return (
    <>
      <PageHeader title="Pengumuman" description="Pengumuman hanya tampil untuk penerima yang dituju, dan diperiksa ulang setiap kali dibuka." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Content />
      </Suspense>
    </>
  );
}
