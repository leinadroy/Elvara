"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Widget sidebar berbentuk accordion (bisa dibuka/ditutup atas-bawah). Memakai <details> agar
 * tetap aksesibel tanpa JavaScript; status terakhir diingat per widget di browser ini.
 */
export function Widget({ id, title, children, defaultOpen = true, action }: { id: string; title: string; children: ReactNode; defaultOpen?: boolean; action?: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const key = `ss-widget-${id}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null && ref.current) ref.current.open = saved === "open";
    } catch {}
  }, [key]);

  return (
    <details
      ref={ref}
      open={defaultOpen}
      onToggle={(e) => {
        try {
          localStorage.setItem(key, e.currentTarget.open ? "open" : "closed");
        } catch {}
      }}
      className="group/widget rounded-lg border border-sidebar-border bg-card/60"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none hover:bg-sidebar-accent [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-1">
          {action}
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open/widget:rotate-180" />
        </span>
      </summary>
      <div className="px-2 pb-2">{children}</div>
    </details>
  );
}
