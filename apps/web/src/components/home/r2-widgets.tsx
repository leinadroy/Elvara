import Link from "next/link";
import { connection } from "next/server";
import { CALENDAR_CATEGORY_LABELS, GRADE_STATE_LABELS, type CalendarEventView, type PortalActivity, type PortalGrades } from "@smart-school/contracts";
import { apiGet } from "@/lib/api-server";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card } from "./home-dashboard";
import { StaleNotice } from "./stale-notice";

const DUE_DAYS = 7;
const AGENDA_DAYS = 30;

function Unavailable({ title }: { title: string }) {
  return (
    <Card title={title}>
      <StaleNotice what="Data bagian ini" />
    </Card>
  );
}

const q = (studentId?: string) => (studentId ? `?studentId=${studentId}` : "");

/** Tugas terbit yang belum dikumpulkan dengan tenggat dalam 7 hari ke depan (FR-16.5). */
async function DueSoonWidget({ studentId, title }: { studentId?: string; title: string }) {
  const res = await apiGet<PortalActivity[]>(`/me/activities${q(studentId)}`);
  if (!res.ok) return <Unavailable title={title} />;
  await connection();
  const now = new Date().getTime(); // server component per permintaan (connection di atas)
  const due = res.data
    .filter((a) => a.status === "PUBLISHED" && a.acceptsSubmissions && a.mine.state === "NOT_SUBMITTED")
    .filter((a) => {
      const t = new Date(a.dueAt).getTime();
      return t >= now && t <= now + DUE_DAYS * 86_400_000;
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const base = studentId ? "/guardian/assignments" : "/student/assignments";
  return (
    <Card title={title} action={<Link href={`${base}${q(studentId)}`} className="text-xs underline">Semua tugas</Link>}>
      <p className="text-xs text-muted-foreground">Belum dikumpulkan, tenggat {DUE_DAYS} hari ke depan</p>
      {due.length ? (
        <ul className="flex flex-col divide-y text-sm">
          {due.slice(0, 4).map((a) => (
            <li key={a.id} className="py-1.5">
              <Link href={`${base}/${a.id}${q(studentId)}`} className="font-medium hover:underline">
                {a.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {a.teachingAssignment.subject.name} · tenggat <span className="font-medium text-foreground">{formatDateTime(a.dueAt)}</span>
              </p>
            </li>
          ))}
          {due.length > 4 && <li className="py-1.5 text-xs text-muted-foreground">+{due.length - 4} tugas lain</li>}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Tidak ada tugas yang perlu dikumpulkan dalam {DUE_DAYS} hari.</p>
      )}
    </Card>
  );
}

/** Nilai yang baru terbit, terbaru lebih dulu (FR-16.5). */
async function LatestGradesWidget({ studentId, title }: { studentId?: string; title: string }) {
  const res = await apiGet<PortalGrades>(`/me/grades${q(studentId)}`);
  if (!res.ok) return <Unavailable title={title} />;
  const items = res.data.subjects
    .flatMap((s) => s.assessments.filter((a) => a.cell && a.publishedAt).map((a) => ({ ...a, subject: s.subject.name })))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 4);
  const href = studentId ? `/guardian/grades${q(studentId)}` : "/student/grades";
  return (
    <Card title={title} action={<Link href={href} className="text-xs underline">Semua nilai</Link>}>
      {items.length ? (
        <ul className="flex flex-col divide-y text-sm">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{a.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {a.subject} · terbit {formatDate(a.publishedAt!)}
                </span>
              </span>
              <span className="text-lg font-semibold tabular-nums">{a.cell!.state === "SCORED" ? a.cell!.score : <span className="text-xs font-normal">{GRADE_STATE_LABELS[a.cell!.state]}</span>}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada nilai yang terbit semester ini.</p>
      )}
    </Card>
  );
}

/** Agenda akademik terbit 30 hari ke depan sesuai audiens (FR-16.5). */
async function AgendaWidget() {
  await connection();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const to = new Date(`${today}T12:00:00Z`);
  to.setUTCDate(to.getUTCDate() + AGENDA_DAYS);
  const res = await apiGet<CalendarEventView[]>(`/calendar?from=${today}&to=${to.toISOString().slice(0, 10)}`);
  if (!res.ok) return <Unavailable title="Agenda mendatang" />;
  const items = res.data.filter((e) => e.status === "PUBLISHED" && e.endsOn >= today).slice(0, 4);
  return (
    <Card title="Agenda mendatang" action={<Link href="/academics/calendar" className="text-xs underline">Kalender</Link>}>
      {items.length ? (
        <ul className="flex flex-col divide-y text-sm">
          {items.map((e) => (
            <li key={e.id} className="py-1.5">
              <span className="font-medium">{e.title}</span>
              <p className="text-xs text-muted-foreground">
                {CALENDAR_CATEGORY_LABELS[e.category]} · {formatDate(e.startsOn)}
                {e.endsOn !== e.startsOn && ` – ${formatDate(e.endsOn)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Tidak ada agenda dalam {AGENDA_DAYS} hari ke depan.</p>
      )}
    </Card>
  );
}

/** Widget R2 untuk siswa (diri sendiri) atau wali (per anak). */
export function PortalR2Widgets({ studentId, name }: { studentId?: string; name?: string }) {
  return (
    <>
      <DueSoonWidget studentId={studentId} title={name ? `Tugas ${name}` : "Tugas dekat tenggat"} />
      <LatestGradesWidget studentId={studentId} title={name ? `Nilai terbaru ${name}` : "Nilai terbaru"} />
    </>
  );
}

export { AgendaWidget };
