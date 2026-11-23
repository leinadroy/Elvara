import type { Metadata } from "next";
import { Suspense } from "react";
import type { GradeLevelView, LessonPeriodView, ProgramView, SubjectView, TeachingAssignmentView } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAcademicOptions, getClasses, pickTerm } from "@/lib/academics";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { AssignmentEdit, AssignmentForm, GradeLevelForm, PeriodsEditor, ProgramForm, ROLE_OPTIONS, SubjectForm } from "./forms";

export const metadata: Metadata = { title: "Pengaturan akademik" };
const BASE = "/academics/setup";
const TABS = [
  { key: "tingkat", label: "Tingkat" },
  { key: "program", label: "Program / jurusan" },
  { key: "mapel", label: "Mata pelajaran" },
  { key: "jam", label: "Jam pelajaran" },
  { key: "penugasan", label: "Penugasan guru" },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const statusText = (s: "ACTIVE" | "INACTIVE") => (s === "ACTIVE" ? "Aktif" : "Nonaktif");

async function Content({ searchParams }: PageProps<"/academics/setup">) {
  const sp = flatParams(await searchParams);
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "tingkat";
  const me = await getMe();
  const manageClasses = me.permissions.includes("classes:manage");
  const manageCurriculum = me.permissions.includes("curriculum:manage");

  let panel: React.ReactNode = null;
  if (tab === "tingkat") {
    const res = await apiGet<GradeLevelView[]>("/grade-levels");
    if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
    panel = (
      <Section title="Tingkat" description="Diatur sekolah (keputusan D1). Urutan menentukan susunan rombel dan kenaikan kelas.">
        {res.data.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urutan</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Rombel</TableHead>
                {manageClasses && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.data.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="tabular-nums">{g.ordinal}</TableCell>
                  <TableCell className="font-mono">{g.code}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell className="tabular-nums">{g.classCount}</TableCell>
                  {manageClasses && (
                    <TableCell className="w-1/2">
                      <GradeLevelForm row={g} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="Belum ada tingkat" />
        )}
        {manageClasses && <GradeLevelForm />}
      </Section>
    );
  } else if (tab === "program") {
    const res = await apiGet<ProgramView[]>("/programs");
    if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
    panel = (
      <Section title="Program / jurusan" description="Opsional, sesuai jenjang (mis. peminatan SMA atau kompetensi keahlian SMK).">
        {res.data.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                {manageClasses && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.code}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{statusText(p.status)}</TableCell>
                  {manageClasses && (
                    <TableCell className="w-1/2">
                      <ProgramForm row={p} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="Belum ada program" description="Lewati bila jenjang sekolah tidak memakai jurusan." />
        )}
        {manageClasses && <ProgramForm />}
      </Section>
    );
  } else if (tab === "mapel") {
    const res = await apiGet<SubjectView[]>("/subjects");
    if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
    panel = (
      <Section title="Mata pelajaran" description="Mapel nonaktif tidak bisa dipakai untuk penugasan baru; riwayat tetap tersimpan.">
        {res.data.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Status</TableHead>
                {manageCurriculum && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.groupCode ?? "—"}</TableCell>
                  <TableCell>{statusText(s.status)}</TableCell>
                  {manageCurriculum && (
                    <TableCell className="w-1/2">
                      <SubjectForm row={s} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="Belum ada mata pelajaran" />
        )}
        {manageCurriculum && <SubjectForm />}
      </Section>
    );
  } else if (tab === "jam") {
    const res = await apiGet<LessonPeriodView[]>("/lesson-periods");
    if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
    panel = (
      <Section title="Jam pelajaran" description="Bel sekolah, dipakai sebagai pilihan cepat saat menyusun jadwal. Jam di zona waktu sekolah.">
        <PeriodsEditor initial={res.data} readOnly={!manageCurriculum} />
      </Section>
    );
  } else {
    const options = await getAcademicOptions();
    const term = pickTerm(options, sp.termId);
    if (!options || !term) return <EmptyState title="Belum ada semester" description="Buat tahun ajaran aktif beserta semesternya di menu Tahun ajaran." />;
    const [res, classes] = await Promise.all([apiGet<TeachingAssignmentView[]>(`/teaching-assignments?termId=${term.id}`), getClasses()]);
    if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
    const teachers = options.teachers.map((t) => ({ value: t.id, label: t.fullName }));
    panel = (
      <Section title={`Penugasan guru · ${term.name}`} description="Guru hanya bisa mengisi absensi untuk penugasannya. Kolom terjadwal dihitung dari jadwal (draf bila sedang disusun).">
        <Picker action={BASE} keep={{ tab }} fields={[{ name: "termId", label: "Semester", value: term.id, options: options.terms.map((t) => ({ value: t.id, label: `${t.name}${t.current ? " (berjalan)" : ""}` })) }]} />
        {res.data.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rombel</TableHead>
                <TableHead>Mapel</TableHead>
                <TableHead>Guru</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Terjadwal / target</TableHead>
                {manageCurriculum && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold">{a.classGroup.code}</TableCell>
                  <TableCell>{a.subject.name}</TableCell>
                  <TableCell>{a.employee.fullName}</TableCell>
                  <TableCell>{ROLE_OPTIONS.find((r) => r.value === a.teachingRole)?.label}</TableCell>
                  <TableCell className={`tabular-nums ${a.scheduledSlots < a.weeklyPeriods ? "font-semibold text-primary" : ""}`}>
                    {a.scheduledSlots} / {a.weeklyPeriods}
                    {a.scheduledSlots < a.weeklyPeriods && <span className="ml-1 text-xs font-normal">kurang</span>}
                  </TableCell>
                  {manageCurriculum && (
                    <TableCell className="w-1/3">
                      <div className="flex flex-wrap items-start gap-1">
                        <AssignmentEdit id={a.id} employeeId={a.employee.id} weeklyPeriods={a.weeklyPeriods} teachers={teachers} />
                        <ActionButton method="DELETE" path={`/teaching-assignments/${a.id}`} label="Hapus" variant="ghost" size="xs" confirm={`Hapus penugasan ${a.subject.name} ${a.classGroup.code}?`} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="Belum ada penugasan di semester ini" />
        )}
        {manageCurriculum && (
          <AssignmentForm termId={term.id} classes={classes.map((c) => ({ value: c.id, label: c.code }))} subjects={options.subjects.map((s) => ({ value: s.id, label: s.name }))} teachers={teachers} />
        )}
      </Section>
    );
  }

  return (
    <>
      <RecordTabs basePath={BASE} active={tab} tabs={TABS} />
      <TabPanel>{panel}</TabPanel>
    </>
  );
}

export default function AcademicSetupPage(props: PageProps<"/academics/setup">) {
  return (
    <>
      <PageHeader title="Pengaturan akademik" description="Struktur yang dipakai rombel, jadwal, dan absensi." />
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
