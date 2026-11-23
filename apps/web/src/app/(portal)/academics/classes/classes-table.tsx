"use client";

import Link from "next/link";
import { ClassGroupSchema, type ClassGroupListItem } from "@smart-school/contracts";
import { DataTable, columnHelper, type SearchParamsRecord } from "@/components/data-table";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";

const col = columnHelper<ClassGroupListItem>();
const columns = col.columns([
  col.accessor("code", {
    id: "code",
    header: "Rombel",
    cell: (info) => (
      <Link href={`/academics/classes/${info.row.original.id}`} className="font-semibold hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor((r) => r.gradeLevel.name, { id: "grade", header: "Tingkat" }),
  col.accessor((r) => r.program?.code ?? "—", { id: "program", header: "Program" }),
  col.accessor((r) => r.homeroom?.fullName ?? "Belum ada", { id: "homeroom", header: "Wali kelas", cell: (info) => <span className={info.row.original.homeroom ? "" : "font-medium text-primary"}>{info.getValue()}</span> }),
  col.accessor((r) => r.mainRoom?.code ?? "—", { id: "room", header: "Ruang" }),
  col.accessor("activeCount", {
    id: "students",
    header: "Siswa",
    cell: (info) => (
      <span className="tabular-nums">
        {info.getValue()} / {info.row.original.capacity}
        {info.getValue() >= info.row.original.capacity && <span className="ml-1 text-xs text-primary">penuh</span>}
      </span>
    ),
  }),
  col.accessor("status", { id: "status", header: "Status", cell: (info) => (info.getValue() === "ACTIVE" ? "Aktif" : "Nonaktif") }),
]);

export function ClassesTable({ data, searchParams }: { data: ClassGroupListItem[]; searchParams: SearchParamsRecord }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      total={data.length}
      page={1}
      pageSize={Math.max(data.length, 1)}
      basePath="/academics/classes"
      searchParams={searchParams}
      sortable={{ code: "code", grade: "grade", students: "students", homeroom: "homeroom" }}
      mobileHidden={["program", "room", "status"]}
      caption="Daftar rombel"
    />
  );
}

type Opt = { value: string; label: string };

export function NewClassForm({ academicYearId, grades, programs, rooms }: { academicYearId: string; grades: Opt[]; programs: Opt[]; rooms: Opt[] }) {
  return (
    <InlineForm<{ id: string }>
      path="/class-groups"
      schema={ClassGroupSchema}
      submitLabel="Tambah rombel"
      transform={(v) => ({ ...v, academicYearId })}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      fields={(e) => (
        <>
          <TextField name="code" label="Kode rombel" required errors={e} description="mis. 7A" />
          <SelectField name="gradeLevelId" label="Tingkat" required placeholder="Pilih…" options={grades} errors={e} />
          <SelectField name="programId" label="Program" placeholder="Tanpa program" options={programs} errors={e} />
          <SelectField name="mainRoomId" label="Ruang utama" placeholder="Belum ditentukan" options={rooms} errors={e} />
          <TextField name="capacity" label="Kapasitas" type="number" inputMode="numeric" defaultValue={32} required errors={e} />
        </>
      )}
    />
  );
}
