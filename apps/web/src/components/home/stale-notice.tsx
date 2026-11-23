"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Penanda data yang gagal dimuat (E8): beranda tetap tampil, bagian yang gagal diberi label jelas beserta
 * jam percobaan. Jam diambil di browser (komponen client) agar halaman server tetap bisa di-prerender.
 */
export function StaleNotice({ what }: { what: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    () => "",
  );
  return (
    <p role="status" className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
      {what} gagal dimuat{time ? ` (${time})` : ""}. Bagian lain tetap terbaru; muat ulang halaman untuk mencoba lagi.
    </p>
  );
}
