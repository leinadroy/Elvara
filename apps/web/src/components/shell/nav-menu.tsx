"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuGroup, MenuItem } from "@/lib/menu";
import { MENU_ICONS } from "./icons";

const ORDER: MenuGroup[] = ["Utama", "Kelas & absensi", "Akademik", "Data induk", "Sekolah", "Pesan", "Sistem", "Akun saya"];

/** Menu utama per peran, dikelompokkan. Halaman aktif ditandai untuk pembaca layar (aria-current). */
export function NavMenu({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (!href.endsWith("/dashboard") && href !== "/me" && href !== "/teacher/attendance" && pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-3">
      {ORDER.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (!groupItems.length) return null;
        return (
          <div key={group} className="flex flex-col gap-0.5">
            {group !== "Utama" && <p className="px-2 pb-0.5 text-[11px] font-medium text-muted-foreground">{group}</p>}
            <ul className="flex flex-col gap-0.5">
              {groupItems.map((item) => {
                const Icon = MENU_ICONS[item.icon];
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
