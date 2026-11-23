import type { Metadata } from "next";
import { Suspense } from "react";
import { WEEKDAY_LABELS, type TeacherToday } from "@smart-school/contracts";
import { OpenSessionButton } from "@/components/attendance/open-session-button";
import { SessionBadge } from "@/components/attendance/status";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Absensi hari ini" };

async function Content() {
  const res = await apiGet<TeacherToday>("/teacher/today");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const t = res.data;
  return (
    <>
      <PageHeader
        title="Absensi hari ini"
        description={`${WEEKDAY_LABELS[t.weekday]}, ${formatDate(t.date)}${t.term ? ` · ${t.term.name}` : ""}. Catatan bisa diubah sampai pukul 23.59; sesudahnya lewat koreksi.`}
      />
      {t.lessons.length === 0 ? (
        <EmptyState title="Tidak ada jadwal mengajar hari ini" description={t.term ? "Jadwal mengikuti versi jadwal yang sudah diterbitkan bagian kurikulum." : "Hari ini di luar masa semester."} />
      ) : (
        <ul className="flex flex-col gap-2">
          {t.lessons.map((l) => (
            <li key={l.timetableSlotId} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="flex w-28 flex-col">
                <span className="font-mono text-sm font-semibold tabular-nums">{l.startTime}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">s.d. {l.endTime}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-lg font-semibold">{l.classGroup.code}</span>
                <span className="text-sm text-muted-foreground">
                  {l.subject.name}
                  {l.room && ` · Ruang ${l.room.code}`}
                  {l.substituteFor && ` · menggantikan ${l.substituteFor.fullName}`}
                </span>
              </div>
              {l.session && (
                <span className="flex items-center gap-2 text-sm">
                  <SessionBadge status={l.session.status} />
                  <span className="tabular-nums">
                    {l.session.filled}/{l.session.total} terisi
                  </span>
                </span>
              )}
              {l.unavailable ? (
                <span className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground">
                  {l.unavailable.kind === "CANCELLED" ? "Dibatalkan" : `Digantikan ${l.unavailable.substitute}`}: {l.unavailable.reason}
                </span>
              ) : (
                <OpenSessionButton timetableSlotId={l.timetableSlotId} date={l.date} sessionId={l.session?.id ?? null} label={l.session ? "Lanjutkan" : "Isi absensi"} />
              )}
            </li>
          ))}
        </ul>
      )}
      {t.homeroomClasses.length > 0 && (
        <p className="text-sm text-muted-foreground">Anda wali kelas {t.homeroomClasses.map((c) => c.code).join(", ")}. Koreksi absensi rombel ini menunggu keputusan Anda di menu Koreksi absensi.</p>
      )}
    </>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content />
    </Suspense>
  );
}
