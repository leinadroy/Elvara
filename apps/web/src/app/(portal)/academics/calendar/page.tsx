import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CALENDAR_AUDIENCE_LABELS, CALENDAR_CATEGORY_LABELS, CALENDAR_STATUS_LABELS, type CalendarEventView } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { getAcademicOptions } from "@/lib/academics";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { CalendarEventForm, CancelEvent, EditEvent } from "./forms";

export const metadata: Metadata = { title: "Kalender akademik" };
const BASE = "/academics/calendar";
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return { from: iso(first), to: iso(last), label: `${MONTHS[m - 1]} ${y}`, prev, next, first, last };
}

/** Kategori dibedakan dengan teks label; warna hanya pelengkap (status = teks + warna). */
function categoryClass(c: CalendarEventView["category"]) {
  return c === "EXAM" ? "bg-primary text-primary-foreground" : c === "HOLIDAY" ? "border border-primary text-foreground" : "bg-secondary text-secondary-foreground";
}

function MonthGrid({ month, events, today }: { month: ReturnType<typeof monthBounds>; events: CalendarEventView[]; today: string }) {
  const lead = (month.first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= month.last.getUTCDate(); d++) cells.push(`${month.from.slice(0, 8)}${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return (
    <div className="hidden overflow-hidden rounded-2xl border bg-card md:block" aria-hidden="true">
      <div className="grid grid-cols-7 border-b bg-muted text-center text-xs font-medium text-muted-foreground">
        {DAYS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          const dayEvents = date ? events.filter((e) => e.startsOn <= date && e.endsOn >= date) : [];
          return (
            <div key={i} className={`min-h-24 border-r border-b p-1 ${date === today ? "bg-accent" : ""}`}>
              {date && <span className={`text-xs ${date === today ? "font-bold text-primary" : "text-muted-foreground"}`}>{Number(date.slice(8))}</span>}
              <div className="mt-0.5 flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <span key={e.id} className={`truncate rounded px-1 text-[11px] ${categoryClass(e.category)} ${e.status === "DRAFT" ? "opacity-60" : ""}`}>
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 3 && <span className="text-[11px] text-muted-foreground">+{dayEvents.length - 3} lagi</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function Content({ searchParams }: PageProps<"/academics/calendar">) {
  await connection();
  const sp = flatParams(await searchParams);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const month = monthBounds(/^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7));
  const me = await getMe();
  const canManage = me.permissions.includes("calendar:manage");
  const [res, options] = await Promise.all([
    apiGet<CalendarEventView[]>(`/calendar${canManage ? "/manage" : ""}?from=${month.from}&to=${month.to}`),
    canManage ? getAcademicOptions() : Promise.resolve(null),
  ]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const grades = (options?.gradeLevels ?? []).map((g) => ({ value: g.id, label: g.name }));
  const visible = res.data.filter((e) => e.status !== "CANCELLED" || canManage);
  return (
    <>
      <nav aria-label="Pilih bulan" className="flex items-center gap-3">
        <Link href={`${BASE}?month=${month.prev}`} className="rounded-lg border px-2 py-1 text-sm hover:bg-muted">
          ← Sebelumnya
        </Link>
        <h2 className="text-lg font-semibold">{month.label}</h2>
        <Link href={`${BASE}?month=${month.next}`} className="rounded-lg border px-2 py-1 text-sm hover:bg-muted">
          Berikutnya →
        </Link>
        {month.from.slice(0, 7) !== today.slice(0, 7) && (
          <Link href={BASE} className="text-sm underline">
            Bulan ini
          </Link>
        )}
      </nav>
      <MonthGrid month={month} events={visible.filter((e) => e.status !== "CANCELLED")} today={today} />
      {visible.length === 0 ? (
        <EmptyState title="Tidak ada agenda bulan ini" description={canManage ? "Tambahkan agenda di bawah; agenda baru tersimpan sebagai draf." : undefined} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={`Agenda ${month.label}`}>
          {visible.map((e) => (
            <li key={e.id} className={`flex flex-col gap-1 rounded-2xl border bg-card p-3 ${e.status === "CANCELLED" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryClass(e.category)}`}>{CALENDAR_CATEGORY_LABELS[e.category]}</span>
                <span className={`font-semibold ${e.status === "CANCELLED" ? "line-through" : ""}`}>{e.title}</span>
                {canManage && <span className="rounded-md border px-1.5 text-xs">{CALENDAR_STATUS_LABELS[e.status]}</span>}
              </div>
              <p className="text-sm text-muted-foreground">
                {e.startsOn === e.endsOn ? formatDate(e.startsOn) : `${formatDate(e.startsOn)} – ${formatDate(e.endsOn)}`}
                {e.location && ` · ${e.location}`} · {e.audience === "GRADE_LEVEL" && e.gradeLevel ? e.gradeLevel.name : CALENDAR_AUDIENCE_LABELS[e.audience]}
              </p>
              {e.description && <p className="text-sm whitespace-pre-line">{e.description}</p>}
              {canManage && e.clashes && e.clashes.length > 0 && (
                <p className="text-xs font-medium text-primary">Beririsan dengan: {e.clashes.map((c) => `${c.title} (${CALENDAR_CATEGORY_LABELS[c.category]})`).join(", ")}</p>
              )}
              {canManage && e.status !== "CANCELLED" && (
                <div className="flex flex-wrap items-start gap-1">
                  {e.status === "DRAFT" && <ActionButton path={`/calendar/${e.id}/publish`} label="Terbitkan" variant="default" size="xs" />}
                  <EditEvent row={e} grades={grades} />
                  <CancelEvent id={e.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Agenda baru</h2>
          <CalendarEventForm grades={grades} />
        </section>
      )}
    </>
  );
}

export default function CalendarPage(props: PageProps<"/academics/calendar">) {
  return (
    <>
      <PageHeader title="Kalender akademik" description="Agenda semester, ujian, libur, dan pembagian rapor." />
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
