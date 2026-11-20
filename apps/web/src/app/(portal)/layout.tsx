import type { ReactNode } from "react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RightSidebar } from "@/components/shell/right-sidebar";
import { MobileSidebarBackdrop } from "@/components/shell/sidebar-controls";
import { HeaderSkeleton, MainMenuWidget, PortalHeader, SchoolInfoWidget } from "./portal-shell";

/**
 * Shell portal:
 *  - Header tetap di atas: logo + cari (kiri), tema, ganti peran, menu pengguna (kanan).
 *  - Sidebar kiri: widget menu utama (atas) dan informasi sekolah (bawah).
 *  - Sidebar kanan: panduan halaman dan widget tambahan.
 *  - Kedua sidebar bisa ditutup untuk memperluas konten; di ponsel tampil sebagai panel.
 * Bagian yang membaca sesi berada di <Suspense> masing-masing, sehingga konten tidak saling menunggu.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#konten" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-card/95 px-2 backdrop-blur sm:px-3">
        <Suspense fallback={<HeaderSkeleton />}>
          <PortalHeader />
        </Suspense>
      </header>
      <Suspense fallback={null}>
        <MobileSidebarBackdrop />
      </Suspense>
      <div className="flex min-h-0 flex-1">
        <aside
          id="sidebar-left"
          aria-label="Sidebar menu"
          className="sticky top-14 flex h-[calc(100svh-3.5rem)] w-64 shrink-0 flex-col justify-between gap-3 overflow-y-auto border-r bg-sidebar p-3"
        >
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <MainMenuWidget />
          </Suspense>
          <SchoolInfoWidget />
        </aside>
        <main id="konten" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-5 border-l-[6px] border-l-[var(--module)] px-4 py-5 outline-none sm:px-6">
          {children}
        </main>
        <aside id="sidebar-right" aria-label="Sidebar informasi" className="sticky top-14 flex h-[calc(100svh-3.5rem)] w-72 shrink-0 flex-col overflow-y-auto border-l bg-sidebar">
          <Suspense fallback={<Skeleton className="m-3 h-40" />}>
            <RightSidebar />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
