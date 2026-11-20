"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/themes";

/** Lebar minimum agar sidebar tampil tetap (bukan panel): kiri 1024px, kanan 1280px. */
const PINNED = { left: "(min-width: 1024px)", right: "(min-width: 1280px)" } as const;

/**
 * Di desktop, tombol menutup/membuka sidebar dan mengingatnya. Di layar kecil, sidebar tampil
 * sebagai panel di atas konten dan tertutup sendiri saat berpindah halaman.
 */
function toggle(side: "left" | "right") {
  const html = document.documentElement;
  if (window.matchMedia(PINNED[side]).matches) {
    const attr = side === "left" ? "data-left-sidebar" : "data-right-sidebar";
    const closed = html.getAttribute(attr) === "closed";
    if (closed) html.removeAttribute(attr);
    else html.setAttribute(attr, "closed");
    try {
      localStorage.setItem(side === "left" ? STORAGE_KEYS.left : STORAGE_KEYS.right, closed ? "open" : "closed");
    } catch {}
  } else {
    const current = html.getAttribute("data-mobile-sidebar");
    if (current === side) html.removeAttribute("data-mobile-sidebar");
    else html.setAttribute("data-mobile-sidebar", side);
  }
}

export function SidebarToggle({ side }: { side: "left" | "right" }) {
  const Icon = side === "left" ? PanelLeft : PanelRight;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-controls={side === "left" ? "sidebar-left" : "sidebar-right"}
      aria-label={side === "left" ? "Buka/tutup sidebar menu" : "Buka/tutup sidebar informasi"}
      title={side === "left" ? "Sidebar menu" : "Sidebar informasi"}
      onClick={() => toggle(side)}
    >
      <Icon />
    </Button>
  );
}

/** Lapisan gelap di belakang panel sidebar seluler; klik atau Escape untuk menutup. */
export function MobileSidebarBackdrop() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.removeAttribute("data-mobile-sidebar");
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") document.documentElement.removeAttribute("data-mobile-sidebar");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 top-14 z-30 hidden bg-black/30 [html[data-mobile-sidebar]_&]:block"
      onClick={() => document.documentElement.removeAttribute("data-mobile-sidebar")}
    />
  );
}
