"use client";

import Link from "next/link";
import { STUDENT_STATUS_LABELS, type StudentListItem } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { DataTable, columnHelper, type SearchParamsRecord } from "@/components/data-table";

const col = columnHelper<StudentListItem>();
const columns = col.columns([
  col.accessor("fullName", {
    id: "name",
    header: "Nama",
    cell: (info) => (
      <Link href={`/admin/students/${info.row.original.id}`} className="font-medium hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor("nis", { id: "nis", header: "NIS" }),
  col.accessor("nisn", { id: "nisn", header: "NISN", cell: (info) => info.getValue() ?? "—" }),
  col.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <Badge variant={info.getValue() === "ACTIVE" ? "default" : "secondary"}>{STUDENT_STATUS_LABELS[info.getValue()]}</Badge>,
  }),
  col.accessor("verifiedGuardianCount", {
    id: "guardians",
    header: "Wali terverifikasi",
    cell: (info) => (info.getValue() > 0 ? info.getValue() : <span className="text-muted-foreground">Belum ada</span>),
  }),
]);

export function StudentsTable(props: { data: StudentListItem[]; total: number; page: number; pageSize: number; searchParams: SearchParamsRecord }) {
  return (
    <DataTable
      {...props}
      columns={columns}
      basePath="/admin/students"
      sortable={{ name: "name", nis: "nis" }}
      mobileHidden={["nisn", "guardians"]}
      caption="Daftar siswa"
    />
  );
}
