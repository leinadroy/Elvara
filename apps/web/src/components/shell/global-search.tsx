"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SearchHit, SearchResult } from "@smart-school/contracts";
import { apiGetClient } from "@/lib/api-client";
import type { MenuItem } from "@/lib/menu";
import { MENU_ICONS } from "./icons";

type Option = { key: string; title: string; subtitle: string; href: string; section: "Menu" | "Data" };

/**
 * Kotak cari global (combobox ARIA): menu dicari langsung di browser, data (siswa, pegawai, wali)
 * lewat API sesuai hak akses. Ctrl+K / ⌘K untuk fokus; panah atas/bawah dan Enter untuk memilih.
 * Mata pelajaran ikut dicari setelah modul akademik (R1) tersedia.
 */
export function GlobalSearch({ menu }: { menu: MenuItem[] }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [result, setResult] = useState<{ term: string; hits: SearchHit[] }>({ term: "", hits: [] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hasil disimpan bersama kata kuncinya; hasil untuk kata kunci lama tidak ditampilkan.
  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await apiGetClient<SearchResult>(`/search?q=${encodeURIComponent(term)}`);
      if (!cancelled) setResult({ term, hits: res.ok ? res.data.hits : [] });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);
  const hits = useMemo(() => (term.length >= 2 && result.term === term ? result.hits : []), [term, result]);
  const loading = term.length >= 2 && result.term !== term;

  const options: Option[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const menuHits = term
      ? menu.filter((m) => `${m.label} ${m.group} ${m.keywords ?? ""}`.toLowerCase().includes(term))
      : menu.slice(0, 6);
    return [
      ...menuHits.map((m) => ({ key: `m:${m.href}`, title: m.label, subtitle: m.group, href: m.href, section: "Menu" as const })),
      ...hits.map((h) => ({ key: `${h.kind}:${h.id}`, title: h.title, subtitle: h.subtitle, href: h.href, section: "Data" as const })),
    ];
  }, [q, hits, menu]);

  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  function go(opt: Option | undefined) {
    if (!opt) return;
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(opt.href);
  }

  const activeId = options[activeIndex] ? `${listId}-${active}` : undefined;

  return (
    <div className="relative w-full max-w-xl min-w-0">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={open ? activeId : undefined}
        aria-autocomplete="list"
        aria-label="Cari siswa, pegawai, wali, atau menu"
        placeholder="Cari siswa, pegawai, menu…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive(Math.min(activeIndex + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(activeIndex - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(options[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-9 w-full min-w-0 rounded-lg border border-input bg-background pr-2 pl-8 text-sm sm:pr-14 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground sm:block">Ctrl K</kbd>
      {open && (q.trim().length > 0 || options.length > 0) && (
        <ul id={listId} role="listbox" aria-label="Hasil pencarian" className="absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground" role="presentation">
              {loading ? "Mencari…" : q.trim().length < 2 ? "Ketik minimal 2 huruf untuk mencari data." : "Tidak ada hasil."}
            </li>
          )}
          {options.map((o, i) => {
            const first = i === 0 || options[i - 1]!.section !== o.section;
            const icon = o.section === "Menu" ? menu.find((m) => m.href === o.href)?.icon : undefined;
            const Icon = icon ? MENU_ICONS[icon] : null;
            return (
              <li key={o.key} role="presentation">
                {first && <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{o.section === "Menu" ? "Menu" : "Data"}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${i === activeIndex ? "bg-accent text-accent-foreground" : ""}`}
                >
                  {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 opacity-70" />}
                  <span className="min-w-0 flex-1 truncate">{o.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{o.section === "Data" ? o.subtitle : o.subtitle}</span>
                </div>
              </li>
            );
          })}
          {loading && options.length > 0 && <li className="px-3 py-1 text-xs text-muted-foreground" role="presentation">Mencari data…</li>}
        </ul>
      )}
    </div>
  );
}

