import type { Metadata } from "next";
import { Suspense } from "react";
import type { ClassGroupListItem } from "@smart-school/contracts";
import { ListToolbar } from "@/components/list-toolbar";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { getAcademicOptions, getClasses } from "@/lib/academics";
import { flatParams, getMe } from "@/lib/api-server";
import { ClassesTable, NewClassForm } from "./classes-table";

export const metadata: Metadata = { title: "Rombel" };
const BASE = "/academics/classes";

const SORTS: Record<string, (a: ClassGroupListItem, b: ClassGroupListItem) => number> = {
  code: (a, b) => a.code.localeCompare(b.code, "id", { numeric: true }),
  grade: (a, b) => a.gradeLevel.name.localeCompare(b.gradeLevel.name, "id", { numeric: true }) || a.code.localeCompare(b.code, "id", { numeric: true }),
  students: (a, b) => a.activeCount - b.activeCount,
  homeroom: (a, b) => (a.homeroom?.fullName ?? "").localeCompare(b.homeroom?.fullName ?? "", "id"),
};

async function Content({ searchParams }: PageProps<"/academics/classes">) {
  const sp = flatParams(await searchParams);
  const [me, options] = await Promise.all([getMe(), getAcademicOptions()]);
  if (!options?.academicYear) return <EmptyState title="Belum ada tahun ajaran aktif" description="Aktifkan tahun ajaran di menu Tahun ajaran sebelum membuat rombel." />;
  let rows = await getClasses(options.academicYear.id);
  const q = sp.q?.trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.code.toLowerCase().includes(q) || r.homeroom?.fullName.toLowerCase().includes(q));
  if (sp.grade) rows = rows.filter((r) => r.gradeLevel.id === sp.grade);
  if (sp.homeroom === "none") rows = rows.filter((r) => !r.homeroom);
  const sortKey = sp.sort?.replace(/^-/, "") ?? "grade";
  rows = [...rows].sort(SORTS[sortKey] ?? SORTS.grade);
  if (sp.sort?.startsWith("-")) rows.reverse();

  return (
    <>
      <p className="text-sm text-muted-foreground">Tahun ajaran {options.academicYear.name}</p>
      <ListToolbar
        basePath={BASE}
        searchParams={{ q: sp.q, grade: sp.grade, homeroom: sp.homeroom }}
        searchLabel="Cari kode rombel atau wali kelas"
        filters={[
          { name: "grade", label: "Tingkat", allLabel: "Semua tingkat", options: options.gradeLevels.map((g) => ({ value: g.id, label: g.name })) },
          { name: "homeroom", label: "Wali kelas", allLabel: "Semua", options: [{ value: "none", label: "Belum ada wali kelas" }] },
        ]}
      />
      {rows.length ? <ClassesTable data={rows} searchParams={sp} /> : <EmptyState title="Tidak ada rombel" description={q || sp.grade ? "Ubah pencarian atau filter." : "Tambahkan rombel pertama di bawah."} />}
      {me.permissions.includes("classes:manage") && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Rombel baru</h2>
          {options.gradeLevels.length ? (
            <NewClassForm
              academicYearId={options.academicYear.id}
              grades={options.gradeLevels.map((g) => ({ value: g.id, label: g.name }))}
              programs={options.programs.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              rooms={options.rooms.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Buat tingkat dulu di Pengaturan akademik.</p>
          )}
        </section>
      )}
    </>
  );
}

export default function ClassesPage(props: PageProps<"/academics/classes">) {
  return (
    <>
      <PageHeader title="Rombel" description="Rombongan belajar, wali kelas, dan penempatan siswa." />
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
