import Link from "next/link";
import { connection } from "next/server";
import type { CalendarEventView, DashboardSummary, Me, PortalActivity, PortalGradesView } from "@smart-school/contracts";
import { apiGet } from "@/lib/api-server";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card } from "./home-dashboard";
import { StaleNotice } from "./stale-notice";

const week = 7 * 24 * 60 * 60 * 1000;
const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

type TeacherQueue = {
  term: string; drafts: number; ungraded: number; missingDescriptions: number; generatedAt: string;
  homerooms: { classGroupId: string; termId: string; label: string; ready: number; total: number }[];
};

async function TeacherWork() {
  const result = await apiGet<TeacherQueue | null>("/report-cards/teacher-dashboard");
  if (!result.ok) return <Card title="Pekerjaan akademik"><StaleNotice what="Pekerjaan akademik" /></Card>;
  const data = result.data;
  if (!data) return <Card title="Pekerjaan akademik"><p className="text-sm text-muted-foreground">Belum ada semester berjalan.</p></Card>;
  const metrics = [
    ["Kiriman belum dinilai", data.ungraded, "Kiriman siswa pada kegiatan terbit atau ditutup tanpa nilai terselesaikan."],
    ["Penilaian belum terbit", data.drafts, "Penilaian draf dari penugasan Anda."],
    ["Deskripsi capaian belum lengkap", data.missingDescriptions, "Pasangan siswa dan penugasan dengan deskripsi yang masih bisa diisi."],
  ] as const;
  return <>
    <Card title="Pekerjaan akademik" action={<Link className="text-xs underline" href="/teacher/assessments">Buka penilaian</Link>}>
      <ul className="divide-y text-sm">{metrics.map(([label, value, definition]) => <li key={label} className="py-2">
        <div className="flex justify-between gap-2"><span>{label}</span><strong className="font-semibold tabular-nums">{value}</strong></div>
        <p className="text-xs text-muted-foreground">{definition}</p>
      </li>)}</ul>
      <p className="mt-2 text-xs text-muted-foreground">{data.term} · Sumber: kiriman, penilaian dan rapor · {formatDateTime(data.generatedAt)}</p>
    </Card>
    {data.homerooms.length > 0 && <Card title="Kelengkapan rapor rombel" action={<Link className="text-xs underline" href="/teacher/reports">Rapor rombel</Link>}>
      <ul className="divide-y text-sm">{data.homerooms.map((group) => <li key={group.classGroupId} className="flex flex-wrap justify-between gap-2 py-2">
        <Link className="underline" href={`/teacher/reports?scope=${encodeURIComponent(`${group.classGroupId}:${group.termId}`)}`}>{group.label}</Link>
        <span className="font-medium tabular-nums">{group.ready}/{group.total} lengkap</span>
      </li>)}</ul>
      <p className="mt-2 text-xs text-muted-foreground">Rapor tanpa kekurangan atau sudah terbit dibanding peserta rombel · Sumber: pratinjau rapor · {formatDateTime(data.generatedAt)}</p>
    </Card>}
  </>;
}

type CurriculumQueue = {
  term: { id: string; name: string }; generatedAt: string; missingSchemes: number;
  groups: { id: string; code: string; total: number; counts: Record<"DRAFT" | "RETURNED" | "SUBMITTED" | "PUBLISHED" | "NOT_STARTED", number> }[];
};

async function CurriculumWork() {
  const result = await apiGet<CurriculumQueue | null>("/report-cards/curriculum-dashboard");
  if (!result.ok) return <Card title="Progres akademik"><StaleNotice what="Progres akademik" /></Card>;
  const data = result.data;
  if (!data) return <Card title="Progres akademik"><p className="text-sm text-muted-foreground">Belum ada semester berjalan.</p></Card>;
  return <>
    <Card title="Skema nilai belum terbit" action={<Link className="text-xs underline" href={`/academics/grading?termId=${data.term.id}`}>Skema nilai</Link>}>
      <p className="text-2xl font-semibold tabular-nums">{data.missingSchemes}</p>
      <p className="text-xs text-muted-foreground">Kombinasi mata pelajaran dan tingkat yang diajar tanpa skema terbit · Sumber: penugasan dan skema nilai</p>
      <p className="text-xs text-muted-foreground">{data.term.name} · {formatDateTime(data.generatedAt)}</p>
    </Card>
    <Card title="Progres rapor per rombel" className="lg:col-span-2">
      {data.groups.length ? <ul className="divide-y text-sm">{data.groups.map(({ id, code, total, counts }) => <li key={id} className="py-2">
        <p className="font-medium">{code} · {counts.PUBLISHED}/{total} terbit</p>
        <p className="text-muted-foreground">{counts.SUBMITTED} diajukan · {counts.DRAFT} draf · {counts.RETURNED} dikembalikan · {counts.NOT_STARTED} belum dimulai</p>
      </li>)}</ul> : <p className="text-sm text-muted-foreground">Belum ada rombel pada semester berjalan.</p>}
      <p className="mt-2 text-xs text-muted-foreground">Status rapor peserta aktif pada {data.term.name} · Sumber: penempatan siswa dan rapor · {formatDateTime(data.generatedAt)}</p>
    </Card>
  </>;
}

async function ApprovalQueue() {
  await connection();
  const queue = await apiGet<{ id: string }[]>("/report-cards/review-queue");
  return <Card title="Rapor menunggu persetujuan" action={<Link className="text-xs underline" href="/academics/report-review">Buka antrean</Link>}>
    {queue.ok ? <>
      <p className="text-2xl font-semibold tabular-nums">{queue.data.length}</p>
      <p className="text-xs text-muted-foreground">Rapor berstatus diajukan di sekolah ini · Sumber: antrean rapor</p>
      <p className="text-xs text-muted-foreground">Diperbarui {formatDateTime(new Date().toISOString())}</p>
    </> : <StaleNotice what="Antrean rapor" />}
  </Card>;
}

async function UpcomingCalendar({ now }: { now: number }) {
  const from = dateKey.format(now);
  const to = dateKey.format(now + week);
  const result = await apiGet<CalendarEventView[]>(`/calendar?from=${from}&to=${to}`);
  return <Card title="Agenda pekan ini" action={<Link className="text-xs underline" href="/academics/calendar">Kalender</Link>}>
    {!result.ok ? <StaleNotice what="Agenda akademik" /> : result.data.length ? <ul className="divide-y text-sm">
      {result.data.slice(0, 3).map((event) => <li key={event.id} className="py-2"><p className="font-medium">{event.title}</p>
        <p className="text-muted-foreground">{formatDate(event.startsOn)}{event.startsOn !== event.endsOn && ` – ${formatDate(event.endsOn)}`}</p></li>)}
    </ul> : <p className="text-sm text-muted-foreground">Belum ada agenda dalam tujuh hari ke depan.</p>}
  </Card>;
}

async function AcademicUpdates({ now, child }: { now: number; child?: { studentId: string; fullName: string } }) {
  const query = child ? `?studentId=${encodeURIComponent(child.studentId)}` : "";
  const area = child ? "/guardian" : "/student";
  const [activities, grades] = await Promise.all([
    apiGet<PortalActivity[]>(`/activities/portal${query}`),
    apiGet<PortalGradesView>(`/me/grades${query}`),
  ]);
  const due = activities.ok ? activities.data.filter((activity) => {
    const deadline = Date.parse(activity.dueAt);
    return activity.status === "PUBLISHED" && activity.acceptsSubmissions && !activity.submissions.length && deadline >= now && deadline <= now + week;
  }).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 3) : [];
  const recent = grades.ok ? [...grades.data.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3) : [];
  const label = child ? ` · ${child.fullName}` : "";
  return <>
    <Card title={`Tugas dekat tenggat${label}`} action={<Link className="text-xs underline" href={`${area}/activities${query}`}>Lihat tugas</Link>}>
      {!activities.ok ? <StaleNotice what="Daftar tugas" /> : due.length ? <ul className="divide-y text-sm">
        {due.map((activity) => <li key={activity.id} className="py-2"><p className="font-medium">{activity.title}</p>
          <p className="text-muted-foreground">{activity.teachingAssignment.subject.name} · {formatDateTime(activity.dueAt)}</p></li>)}
      </ul> : <p className="text-sm text-muted-foreground">Tidak ada tugas yang belum dikumpulkan dengan tenggat tujuh hari ke depan.</p>}
    </Card>
    <Card title={`Nilai terbaru${label}`} action={<Link className="text-xs underline" href={`${area}/grades${query}`}>Lihat nilai</Link>}>
      {!grades.ok ? <StaleNotice what="Nilai terbaru" /> : recent.length ? <ul className="divide-y text-sm">
        {recent.map((grade) => <li key={grade.assessmentId} className="py-2"><p className="font-medium">{grade.title}</p>
          <p className="text-muted-foreground">{grade.subject} · {grade.score ?? (grade.state === "MISSING" ? "Tidak mengumpulkan" : grade.state === "EXCUSED" ? "Tidak berlaku" : "Belum dinilai")}</p></li>)}
      </ul> : <p className="text-sm text-muted-foreground">Belum ada nilai terbit.</p>}
    </Card>
  </>;
}

export async function R2Widgets({ me, summary }: { me: Me; summary: DashboardSummary }) {
  if (me.permissions.includes("report-cards:approve")) return <ApprovalQueue />;
  if (me.activeRole === "TEACHER") return <TeacherWork />;
  if (me.activeRole === "CURRICULUM") return <CurriculumWork />;
  if (me.activeRole !== "STUDENT" && me.activeRole !== "GUARDIAN") return null;
  await connection();
  const now = Date.parse(summary.generatedAt);
  return <>
    <UpcomingCalendar now={now} />
    {me.activeRole === "STUDENT" ? <AcademicUpdates now={now} /> : summary.children?.filter((child) => child.canViewAcademic)
      .map((child) => <AcademicUpdates key={child.studentId} now={now} child={child} />)}
  </>;
}
