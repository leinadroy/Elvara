"use client";

import { Check, Palette } from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { STORAGE_KEYS, THEMES, type ThemeId } from "@/lib/themes";

export function ThemeSwitcher() {
  // Daftar tema hanya dirender saat menu dibuka (di browser), jadi aman membaca atribut <html> saat inisialisasi.
  const [current, setCurrent] = useState<ThemeId>(() =>
    typeof document === "undefined" ? "elvara" : ((document.documentElement.getAttribute("data-theme") as ThemeId | null) ?? "elvara"),
  );

  function apply(id: ThemeId) {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, id);
    } catch {}
    setCurrent(id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Ganti tema" title="Ganti tema">
        <Palette />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema tampilan</DropdownMenuLabel>
          {THEMES.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => apply(t.id)}>
              <span aria-hidden="true" className="size-4 rounded-full border" style={{ background: t.swatch }} />
              <span className="flex-1">{t.label}</span>
              {current === t.id && <Check aria-label="dipilih" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
