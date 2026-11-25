import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { ClassGroupDetail, TeachingAssignmentView } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, LoadingBlock } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAcademicOptions, getClasses, pickTerm } from "@/lib/academics";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { AssignmentEdit, AssignmentForm } from "../../setup/forms";
import { ClassRecord, EnrollmentActions, EnrollPanel, HomeroomForm } from "./class-record";

export const metadata: Metadata = { title: "Rombel" };

const ENROLLMENT_STATUS = { ACTIVE: "Aktif", MOVED: "Pindah", ENDED: "Berakhir" } as const;

async function Content({ params, searchParams }: PageProps<"/academics/classes/[classId]">) {
  await connection();
  const { classId } = await params;
  const sp = flatParams(await searchParams);
  const base = `/academics/classes/${classId}`;
  const [me, res, options] = await Promise.all([getMe(), apiGet<ClassGroupDetail>(`/class-groups/${classId}`), getAcademicOptions()]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const c = res.data;
  const manage = me.permissions.includes("classes:manage");
  const manageCurriculum = me.permissions.includes("curriculum:manage");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const teachers = (options?.teachers ?? []).map((t) => ({ value: t.id, label: t.fullName }));
  const tab = ["siswa", "wali", "penugasan"].includes(sp.tab ?? "") ? sp.tab! : "siswa";
  const term = pickTerm(options, sp.termId);
  const active = c.enrollments.filter((e) => !e.validTo || e.validTo >= today);

  let panel: React.ReactNode;
  if (tab === "siswa") {
    const others = (await getClasses(c.academicYear.id)).filter((x) => x.id !== c.id).map((x) => ({ value: x.id, label: x.code }));
    panel = (
      <>
        {c.enrollments.length ? (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  {manage && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.enrollments.map((e) => (
                  <TableRow key={e.id} className={e.validTo && e.validTo < today ? "text-muted-foreground" : ""}>
                    <TableCell className="font-medium">{e.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{e.nis}</TableCell>
                    <TableCell className="text-xs">
                      {formatDate(e.validFrom)} – {e.validTo ? formatDate(e.validTo) : "sekarang"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {ENROLLMENT_STATUS[e.status]}
                      {e.reason && <span className="block text-muted-foreground">{e.reason}</span>}
                    </TableCell>
                    {manage && (
                      <TableCell>
                        <EnrollmentActions e={e} classes={others} today={today} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="Belum ada siswa di rombel ini" />
        )}
        {manage && (
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <h2 className="font-semibold">Tempatkan siswa</h2>
            <EnrollPanel classId={c.id} today={today} />
          </section>
        )}
      </>
    );
  } else if (tab === "wali") {
    panel = (
      <>
        {c.homeroomHistory.length ? (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {c.homeroomHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                <span className="font-medium">{h.employee.fullName}</span>
                <span className="text-muted-foreground">
                  {formatDate(h.validFrom)} – {h.validTo ? formatDate(h.validTo) : "sekarang"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada wali kelas" />
        )}
        {manage && (
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <h2 className="font-semibold">{c.homeroom ? "Ganti wali kelas" : "Tetapkan wali kelas"}</h2>
            <HomeroomForm classId={c.id} teachers={teachers} today={today} />
          </section>
        )}
      </>
    );
  } else {
    const ta = term ? await apiGet<TeachingAssignmentView[]>(`/teaching-assignments?termId=${term.id}&classGroupId=${c.id}`) : null;
    panel = !term ? (
      <EmptyState title="Belum ada semester" />
    ) : !ta?.ok ? (
      <EmptyState title="Penugasan belum dapat dimuat" />
    ) : (
      <>
        <p className="text-sm text-muted-foreground">
          {term.name} ·{" "}
          <Link href={`/academics/timetable?termId=${term.id}&classGroupId=${c.id}`} className="underline">
            Buka jadwal rombel ini
          </Link>
        </p>
        {ta.data.length ? (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {ta.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-2 p-3 text-sm">
                <span className="min-w-0 flex-1">
                  <Link href={`/teacher/grades/${a.id}`} className="font-medium hover:underline">
                    {a.subject.name}
                  </Link>{" "}
                  · {a.employee.fullName}
                  <span className={`block text-xs ${a.scheduledSlots < a.weeklyPeriods ? "text-primary" : "text-muted-foreground"}`}>
                    {a.scheduledSlots} dari {a.weeklyPeriods} jam per minggu terjadwal
                  </span>
                </span>
                {manageCurriculum && (
                  <span className="flex gap-1">
                    <AssignmentEdit id={a.id} employeeId={a.employee.id} weeklyPeriods={a.weeklyPeriods} teachers={teachers} />
                    <ActionButton method="DELETE" path={`/teaching-assignments/${a.id}`} label="Hapus" variant="ghost" size="xs" confirm={`Hapus penugasan ${a.subject.name}?`} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada penugasan" />
        )}
        {manageCurriculum && options && (
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <h2 className="font-semibold">Tambah penugasan</h2>
            <AssignmentForm termId={term.id} fixedClassId={c.id} classes={[]} subjects={options.subjects.map((s) => ({ value: s.id, label: s.name }))} teachers={teachers} />
          </section>
        )}
      </>
    );
  }

  return (
    <ClassRecord
      c={c}
      readOnly={!manage}
      grades={(options?.gradeLevels ?? []).map((g) => ({ value: g.id, label: g.name }))}
      programs={(options?.programs ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
      rooms={(options?.rooms ?? []).map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }))}
      tabs={
        <>
          <RecordTabs
            basePath={base}
            active={tab}
            tabs={[
              { key: "siswa", label: "Siswa", count: active.length },
              { key: "wali", label: "Wali kelas", count: c.homeroomHistory.length },
              { key: "penugasan", label: "Penugasan guru" },
            ]}
          />
          <TabPanel>{panel}</TabPanel>
        </>
      }
    />
  );
}

export default function ClassDetailPage(props: PageProps<"/academics/classes/[classId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <Content {...props} />
    </Suspense>
  );
}
