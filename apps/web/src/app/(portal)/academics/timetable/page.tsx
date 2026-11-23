import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  SCHEDULE_EXCEPTION_LABELS,
  WEEKDAY_LABELS,
  type ClassTimetable,
  type PublishedTimetable,
  type ScheduleExceptionView,
  type TeachingAssignmentView,
  type TimetableSlotView,
} from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { Picker } from "@/components/academics/picker";
import { WeekTimetable } from "@/components/academics/week-timetable";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { getAcademicOptions, getClasses, pickTerm } from "@/lib/academics";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { formatDate, formatDateTime } from "@/lib/format";
import { ExceptionForm, PublishForm, SlotForm } from "./editor";

export const metadata: Metadata = { title: "Jadwal pelajaran" };
const BASE = "/academics/timetable";

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function DraftSlots({ slots, conflictIds, editable }: { slots: TimetableSlotView[]; conflictIds: Set<string>; editable: boolean }) {
  if (!slots.length) return <p className="text-sm text-muted-foreground">Draf masih kosong.</p>;
  const days = [...new Set(slots.map((s) => s.weekday))].sort();
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((d) => (
        <section key={d} className="flex flex-col gap-1.5 rounded-xl border p-2" aria-label={WEEKDAY_LABELS[d]}>
          <h4 className="text-sm font-semibold">{WEEKDAY_LABELS[d]}</h4>
          {slots
            .filter((s) => s.weekday === d)
            .map((s) => (
              <div key={s.id} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${conflictIds.has(s.id) ? "border border-primary bg-accent" : "bg-muted"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs tabular-nums">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="font-medium">{s.subject.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.employee.fullName}
                    {s.room && ` · ${s.room.code}`}
                  </span>
                  {conflictIds.has(s.id) && <span className="text-xs font-semibold text-primary">Bentrok</span>}
                </span>
                {editable && <ActionButton method="DELETE" path={`/timetable/slots/${s.id}`} label="Hapus" variant="ghost" size="xs" />}
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}

async function ClassView({ sp, canManage }: { sp: Record<string, string | undefined>; canManage: boolean }) {
  const options = await getAcademicOptions();
  const term = pickTerm(options, sp.termId);
  const classes = await getClasses(options?.academicYear?.id);
  if (!options || !term) return <EmptyState title="Belum ada semester" description="Buat tahun ajaran aktif beserta semesternya dulu." />;
  if (!classes.length) return <EmptyState title="Belum ada rombel" description="Buat rombel di menu Rombel." />;
  const cls = classes.find((c) => c.id === sp.classGroupId) ?? classes[0]!;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const [res, assignments, exceptions] = await Promise.all([
    apiGet<ClassTimetable>(`/timetable?termId=${term.id}&classGroupId=${cls.id}`),
    apiGet<TeachingAssignmentView[]>(`/teaching-assignments?termId=${term.id}&classGroupId=${cls.id}`),
    apiGet<ScheduleExceptionView[]>(`/timetable/exceptions?from=${today}&to=${addDays(today, 30)}&classGroupId=${cls.id}`),
  ]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const t = res.data;
  const teachers = options.teachers.map((x) => ({ value: x.id, label: x.fullName }));
  const rooms = options.rooms.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }));
  const conflictIds = new Set(t.draft?.conflicts.map((c) => c.slotId));

  return (
    <>
      <Picker
        action={BASE}
        fields={[
          { name: "termId", label: "Semester", value: term.id, options: options.terms.map((x) => ({ value: x.id, label: `${x.name}${x.current ? " (berjalan)" : ""}` })) },
          { name: "classGroupId", label: "Rombel", value: cls.id, options: classes.map((c) => ({ value: c.id, label: c.code })) },
        ]}
      />

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Jadwal terbit {cls.code} · {term.name}
          </h2>
          {t.published && (
            <p className="text-xs text-muted-foreground">
              Versi {t.published.versionNo} · berlaku {formatDate(t.published.effectiveFrom)} · terbit {formatDateTime(t.published.publishedAt)}
            </p>
          )}
        </div>
        {t.published ? <WeekTimetable slots={t.published.slots} show="teacher" highlightToday={false} /> : <p className="text-sm text-muted-foreground">Belum ada jadwal terbit untuk rombel ini.</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t.draft ? `Draf versi ${t.draft.versionNo}` : "Draf"}</h2>
          {canManage && t.draft && <ActionButton method="DELETE" path={`/timetable/versions/${t.draft.id}`} label="Buang draf" variant="ghost" confirm="Buang draf ini? Jadwal terbit tidak berubah." />}
        </div>
        {!t.draft ? (
          canManage ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">{t.published ? "Buat draf untuk mengubah jadwal. Draf dimulai dari salinan jadwal terbit." : "Mulai menyusun jadwal rombel ini."}</p>
              <ActionButton path="/timetable/drafts" body={{ termId: term.id, classGroupId: cls.id }} label="Buat draf" variant="default" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada draf.</p>
          )
        ) : (
          <>
            {t.draft.conflicts.length > 0 ? (
              <div role="alert" className="rounded-lg border border-primary bg-accent p-3 text-sm text-accent-foreground">
                <p className="font-semibold">{t.draft.conflicts.length} benturan</p>
                <ul className="mt-1 list-disc pl-5">
                  {t.draft.conflicts.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada benturan guru, rombel, atau ruang.</p>
            )}
            <DraftSlots slots={t.draft.slots} conflictIds={conflictIds} editable={canManage} />
            {canManage && (
              <>
                {assignments.ok && assignments.data.length ? (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <h3 className="text-sm font-semibold">Tambah pertemuan</h3>
                    <SlotForm
                      versionId={t.draft.id}
                      assignments={assignments.data.map((a) => ({ value: a.id, label: `${a.subject.name} · ${a.employee.fullName} (${a.scheduledSlots}/${a.weeklyPeriods})` }))}
                      rooms={rooms}
                      periods={t.periods}
                      defaultRoomId={cls.mainRoom?.id}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada penugasan guru untuk rombel ini di {term.name}.{" "}
                    <Link href={`/academics/classes/${cls.id}?tab=penugasan`} className="underline">
                      Tambah penugasan
                    </Link>
                  </p>
                )}
                <div className="border-t pt-3">
                  <PublishForm versionId={t.draft.id} defaultDate={today < term.startDate ? term.startDate : today} disabled={t.draft.conflicts.length > 0 || !t.draft.slots.length} />
                </div>
              </>
            )}
          </>
        )}
      </section>

      {t.published && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="font-semibold">Perubahan pertemuan (30 hari ke depan)</h2>
            <p className="text-sm text-muted-foreground">Batal atau diganti guru/ruang untuk satu tanggal. Jadwal mingguan tidak berubah.</p>
          </div>
          {exceptions.ok && exceptions.data.length ? (
            <ul className="flex flex-col divide-y rounded-lg border">
              {exceptions.data.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      {formatDate(x.date)} · {x.startTime} {x.subject.name}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {SCHEDULE_EXCEPTION_LABELS[x.kind]}
                      {x.substitute && ` → ${x.substitute.fullName}`}
                      {x.room && ` · ruang ${x.room.code}`} · {x.reason}
                    </span>
                  </span>
                  {canManage && <ActionButton method="DELETE" path={`/timetable/exceptions/${x.id}`} label="Hapus" variant="ghost" size="xs" />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada perubahan pertemuan.</p>
          )}
          {canManage && <ExceptionForm slots={t.published.slots} teachers={teachers} rooms={rooms} today={today} />}
        </section>
      )}
    </>
  );
}

async function LensView({ sp, kind }: { sp: Record<string, string | undefined>; kind: "guru" | "ruang" }) {
  const options = await getAcademicOptions();
  const term = pickTerm(options, sp.termId);
  if (!options || !term) return <EmptyState title="Belum ada semester" />;
  const list = kind === "guru" ? options.teachers.map((x) => ({ value: x.id, label: x.fullName })) : options.rooms.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }));
  const param = kind === "guru" ? "employeeId" : "roomId";
  const chosen = list.find((x) => x.value === sp[param]) ?? list[0];
  if (!chosen) return <EmptyState title={kind === "guru" ? "Belum ada guru aktif" : "Belum ada ruang"} />;
  const res = await apiGet<PublishedTimetable>(`/timetable/lens?termId=${term.id}&${param}=${chosen.value}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <Picker
        action={BASE}
        keep={{ tab: kind }}
        fields={[
          { name: "termId", label: "Semester", value: term.id, options: options.terms.map((x) => ({ value: x.id, label: x.name })) },
          { name: param, label: kind === "guru" ? "Guru" : "Ruang", value: chosen.value, options: list },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Jadwal terbit {chosen.label} · {term.name} · {res.data.slots.length} pertemuan per minggu
      </p>
      {res.data.slots.length ? <WeekTimetable slots={res.data.slots} show={kind === "guru" ? "class" : "both"} highlightToday={false} /> : <EmptyState title="Tidak ada pertemuan terjadwal" />}
    </>
  );
}

async function Content({ searchParams }: PageProps<"/academics/timetable">) {
  const sp = flatParams(await searchParams);
  const me = await getMe();
  const v = sp.tab ?? sp.view;
  const view = v === "guru" || v === "ruang" ? v : "rombel";
  return (
    <>
      <RecordTabs
        basePath={BASE}
        active={view}
        tabs={[
          { key: "rombel", label: "Per rombel" },
          { key: "guru", label: "Per guru" },
          { key: "ruang", label: "Per ruang" },
        ]}
      />
      <TabPanel>{view === "rombel" ? <ClassView sp={sp} canManage={me.permissions.includes("curriculum:manage")} /> : <LensView sp={sp} kind={view} />}</TabPanel>
    </>
  );
}

export default function TimetablePage(props: PageProps<"/academics/timetable">) {
  return (
    <>
      <PageHeader title="Jadwal pelajaran" description="Susun draf, periksa benturan, lalu terbitkan. Jadwal yang sama bisa dilihat per rombel, per guru, atau per ruang." />
      <Suspense fallback={<LoadingBlock rows={8} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
