import { WEEKDAY_LABELS, type TimetableSlotView } from "@smart-school/contracts";

/**
 * Jadwal seminggu: satu kolom per hari (di ponsel bertumpuk). Senin–Jumat selalu tampil agar pola minggu
 * terbaca; Sabtu/Minggu hanya bila ada slot.
 */
/** `today` (YYYY-MM-DD, zona sekolah) diisi pemanggil agar komponen tetap murni dan bisa di-prerender. */
export function WeekTimetable({ slots, show = "teacher", today: todayDate }: { slots: TimetableSlotView[]; show?: "teacher" | "class" | "both"; today?: string }) {
  const today = todayDate ? ((new Date(`${todayDate}T12:00:00Z`).getUTCDay() + 6) % 7) + 1 : 0;
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => d <= 5 || slots.some((s) => s.weekday === d));
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {days.map((d) => {
        const daySlots = slots.filter((s) => s.weekday === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = d === today;
        return (
          <section key={d} aria-label={WEEKDAY_LABELS[d]} className={`flex flex-col gap-1.5 rounded-2xl border bg-card p-3 ${isToday ? "border-primary" : ""}`}>
            <h3 className="flex items-center justify-between text-sm font-semibold">
              {WEEKDAY_LABELS[d]}
              {isToday && <span className="rounded bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">Hari ini</span>}
            </h3>
            {daySlots.length ? (
              <ul className="flex flex-col gap-1.5">
                {daySlots.map((s) => (
                  <li key={s.id} className="rounded-lg bg-muted px-2 py-1.5 text-sm">
                    <span className="block font-mono text-xs text-muted-foreground tabular-nums">
                      {s.startTime}–{s.endTime}
                    </span>
                    <span className="font-medium">{s.subject.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[show !== "teacher" ? s.classGroup.code : null, show !== "class" ? s.employee.fullName : null, s.room?.code].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada pelajaran.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
