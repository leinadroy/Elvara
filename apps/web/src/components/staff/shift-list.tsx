import type { ReactNode } from "react";
import { WEEKDAY_LABELS, type WorkShiftView } from "@smart-school/contracts";
import { formatDate } from "@/lib/format";

const weekday = (date: string) => WEEKDAY_LABELS[((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1];

/** Daftar tugas dikelompokkan per tanggal. Tugas dibatalkan tetap tampil dicoret beserta alasannya. */
export function ShiftList({ items, showEmployee, today, action }: { items: WorkShiftView[]; showEmployee: boolean; today?: string; action?: (s: WorkShiftView) => ReactNode }) {
  const dates = [...new Set(items.map((s) => s.date))];
  return (
    <div className="flex flex-col gap-3">
      {dates.map((d) => (
        <section key={d} aria-label={formatDate(d)} className={`rounded-2xl border bg-card p-3 ${d === today ? "border-primary" : ""}`}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {weekday(d)}, {formatDate(d)}
            {d === today && <span className="rounded bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">Hari ini</span>}
          </h2>
          <ul className="flex flex-col divide-y">
            {items
              .filter((s) => s.date === d)
              .map((s) => (
                <li key={s.id} className={`flex flex-wrap items-start gap-3 py-2 text-sm ${s.status === "CANCELLED" ? "text-muted-foreground" : ""}`}>
                  <span className="w-28 font-mono text-xs tabular-nums">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`font-medium ${s.status === "CANCELLED" ? "line-through" : ""}`}>{s.title}</span>
                    {showEmployee && <span className="text-muted-foreground"> · {s.employee.fullName}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {s.room ? `${s.room.code} · ${s.room.name}` : "Lokasi belum ditentukan"}
                      {s.note && ` · ${s.note}`}
                    </span>
                    {s.status === "CANCELLED" && <span className="block text-xs font-medium">Dibatalkan: {s.cancelReason}</span>}
                  </span>
                  {action?.(s)}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
