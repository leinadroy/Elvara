import Link from "next/link";
import { connection } from "next/server";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUSES,
  WEEKDAY_LABELS,
  type AnnouncementView,
  type DashboardSummary,
  type Me,
  type PersonalAttendance,
  type PortalClassTimetable,
  type TeacherToday,
} from "@smart-school/contracts";
import { OpenSessionButton } from "@/components/attendance/open-session-button";
import { SessionBadge } from "@/components/attendance/status";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { Fragment } from "react";
import { Card } from "./home-dashboard";
import { StaleNotice } from "./stale-notice";

function Unavailable({ title, className = "" }: { title: string; className?: string }) {
  return (
    <Card title={title} className={className}>
      <StaleNotice what="Data bagian ini" />
    </Card>
  );
}

async function TeacherTodayWidget() {
  const res = await apiGet<TeacherToday>("/teacher/today");
  if (!res.ok) return <Unavailable title="Mengajar hari ini" className="lg:col-span-2" />;
  const t = res.data;
  return (
    <Card title={`Mengajar hari ini · ${WEEKDAY_LABELS[t.weekday]}`} className="lg:col-span-2" action={<Link href="/teacher/attendance" className="text-xs underline">Semua</Link>}>
      {t.lessons.length ? (
        <ul className="flex flex-col divide-y">
          {t.lessons.map((l) => (
            <li key={l.timetableSlotId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="w-24 font-mono text-xs tabular-nums">
                {l.startTime}–{l.endTime}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{l.classGroup.code}</span> · {l.subject.name}
                {l.room && <span className="text-muted-foreground"> · {l.room.code}</span>}
                {l.substituteFor && <span className="text-muted-foreground"> · menggantikan {l.substituteFor.fullName}</span>}
              </span>
              {l.session && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SessionBadge status={l.session.status} /> {l.session.filled}/{l.session.total}
                </span>
              )}
              {l.unavailable ? (
                <span className="text-xs text-muted-foreground">{l.unavailable.kind === "CANCELLED" ? "Dibatalkan" : `Digantikan ${l.unavailable.substitute}`}</span>
              ) : (
                <OpenSessionButton timetableSlotId={l.timetableSlotId} date={l.date} sessionId={l.session?.id ?? null} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.term ? "Tidak ada jadwal mengajar hari ini." : "Hari ini di luar masa semester."}</p>
      )}
      {t.homeroomClasses.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Wali kelas: {t.homeroomClasses.map((c) => c.code).join(", ")} ·{" "}
          <Link href="/teacher/attendance/corrections" className="underline">
            koreksi absensi
          </Link>{" "}
          ·{" "}
          <Link href="/academics/attendance-recap" className="underline">
            rekap
          </Link>
        </p>
      )}
    </Card>
  );
}

async function TodayClassWidget({ studentId, title }: { studentId?: string; title: string }) {
  const res = await apiGet<PortalClassTimetable>(`/me/class-timetable${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <Unavailable title={title} />;
  await connection(); // tanggal hari ini dihitung saat permintaan, bukan saat prerender
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const weekday = ((new Date(`${todayIso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const today = res.data.slots.filter((s) => s.weekday === weekday);
  const changeOf = (slotId: string) => res.data.changes.find((c) => c.timetableSlotId === slotId && c.date === todayIso);
  return (
    <Card title={`${title} · ${WEEKDAY_LABELS[weekday]}`} action={<Link href={studentId ? `/guardian/timetable?studentId=${studentId}` : "/student/timetable"} className="text-xs underline">Seminggu</Link>}>
      {res.data.classGroup && <p className="text-xs text-muted-foreground">Rombel {res.data.classGroup.code}</p>}
      {today.length ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {today.map((s) => {
            const ch = changeOf(s.id);
            return (
              <li key={s.id} className="flex gap-3">
                <span className="w-24 font-mono text-xs tabular-nums">
                  {s.startTime}–{s.endTime}
                </span>
                <span className={ch?.kind === "CANCELLED" ? "text-muted-foreground line-through" : ""}>{s.subject.name}</span>
                {ch && (
                  <span className="rounded bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                    {ch.kind === "CANCELLED" ? "Batal" : `Diganti${ch.substitute ? `: ${ch.substitute.fullName}` : ""}${ch.room ? ` · ${ch.room.code}` : ""}`}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Tidak ada pelajaran hari ini.</p>
      )}
    </Card>
  );
}

async function AttendanceWidget({ studentId, title }: { studentId?: string; title: string }) {
  const res = await apiGet<PersonalAttendance>(`/me/attendance${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <Unavailable title={title} />;
  const href = studentId ? `/guardian/attendance?studentId=${studentId}` : "/student/attendance";
  return (
    <Card title={title} action={<Link href={href} className="text-xs underline">Rincian</Link>}>
      <p className="text-xs text-muted-foreground">30 hari terakhir</p>
      <dl className="grid grid-cols-5 gap-0.5 text-center">
        {ATTENDANCE_STATUSES.map((k) => (
          <div key={k} className={`rounded-lg p-1.5 ${k === "ABSENT" && res.data.counts[k] ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <dd className="text-lg font-bold tabular-nums">{res.data.counts[k]}</dd>
            <dt className="text-[10px] leading-tight break-words">{ATTENDANCE_STATUS_LABELS[k]}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}

async function AnnouncementsWidget() {
  const res = await apiGet<AnnouncementView[]>("/announcements");
  if (!res.ok) return <Unavailable title="Pengumuman" />;
  return (
    <Card title="Pengumuman" action={<Link href="/messages/announcements" className="text-xs underline">Semua</Link>}>
      {res.data.length ? (
        <ul className="flex flex-col divide-y text-sm">
          {res.data.slice(0, 3).map((a) => (
            <li key={a.id} className="py-1.5">
              <Link href={`/messages/announcements#${a.id}`} className="font-medium hover:underline">
                {a.title}
              </Link>
              <p className="text-xs text-muted-foreground">{formatDateTime(a.publishAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada pengumuman.</p>
      )}
    </Card>
  );
}

function AcademicsWidget() {
  return (
    <Card title="Akademik" className="lg:col-span-2">
      <ul className="grid gap-2 text-sm sm:grid-cols-3">
        {[
          ["/academics/classes", "Rombel & wali kelas", "Penempatan siswa, kapasitas, riwayat wali kelas"],
          ["/academics/timetable", "Jadwal pelajaran", "Susun draf, periksa benturan, terbitkan"],
          ["/academics/setup", "Pengaturan", "Tingkat, program, mapel, jam pelajaran, penugasan guru"],
        ].map(([href, label, note]) => (
          <li key={href}>
            <Link href={href!} className="flex h-full flex-col gap-1 rounded-xl border p-3 hover:border-[var(--module)]">
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Widget R1 per peran aktif (blueprint 04: beranda berisi hal yang perlu dikerjakan hari ini). */
export async function RoleWidgets({ me, s }: { me: Me; s: DashboardSummary }) {
  const role = me.activeRole;
  return (
    <>
      {role === "TEACHER" && me.permissions.includes("attendance:take") && <TeacherTodayWidget />}
      {(role === "CURRICULUM" || role === "ADMIN") && <AcademicsWidget />}
      {role === "STUDENT" && (
        <>
          <TodayClassWidget title="Pelajaran hari ini" />
          <AttendanceWidget title="Kehadiran saya" />
        </>
      )}
      {role === "STAFF" && (
        <Card title="Jadwal tugas" className="lg:col-span-2">
          <p className="text-sm text-muted-foreground">Jadwal tugas dan shift staf diisi dari modul kehadiran pegawai (rilis R3). Sampai saat itu, ikuti pengumuman internal di bawah.</p>
        </Card>
      )}
      {role === "GUARDIAN" &&
        (s.children ?? []).map((c) => (
          <Fragment key={c.studentId}>
            <TodayClassWidget studentId={c.studentId} title={`Jadwal ${c.fullName}`} />
            <AttendanceWidget studentId={c.studentId} title={`Kehadiran ${c.fullName}`} />
          </Fragment>
        ))}
      <AnnouncementsWidget />
    </>
  );
}
