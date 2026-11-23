"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { NotificationView } from "@smart-school/contracts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { apiGetClient, apiSend } from "@/lib/api-client";

type Feed = { items: NotificationView[]; unread: number };

/** Lonceng notifikasi dalam aplikasi (D8). Dimuat ulang saat pindah halaman dan setiap 60 detik. */
export function NotificationBell() {
  const pathname = usePathname();
  const router = useRouter();
  const [feed, setFeed] = useState<Feed | null>(null);
  const load = useCallback(async () => {
    const res = await apiGetClient<Feed>("/notifications");
    if (res.ok) setFeed(res.data);
  }, []);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive) void load();
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [load, pathname]);

  const unread = feed?.unread ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} relative`} aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}>
        <Bell />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
          {feed?.items.length ? (
            feed.items.slice(0, 5).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-0.5"
                onClick={() => {
                  if (!n.readAt) void apiSend("POST", `/notifications/${n.id}/read`).then(load);
                  router.push(n.link ?? "/messages/notifications");
                }}
              >
                <span className={`text-sm ${n.readAt ? "" : "font-semibold"}`}>
                  {!n.readAt && <span className="sr-only">Belum dibaca: </span>}
                  {n.title}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">Belum ada notifikasi.</p>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/messages/notifications")}>Lihat semua</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
