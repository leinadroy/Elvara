"use client";

import Link from "next/link";
import { EMPLOYMENT_TYPE_LABELS, type EmployeeListItem } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { DataTable, columnHelper, type SearchParamsRecord } from "@/components/data-table";

const col = columnHelper<EmployeeListItem>();
const columns = col.columns([
  col.accessor("fullName", {
    id: "name",
    header: "Nama",
    cell: (info) => (
      <Link href={`/admin/employees/${info.row.original.id}`} className="font-medium hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor("employeeNumber", { id: "employeeNumber", header: "No. pegawai" }),
  col.accessor("position", { id: "position", header: "Jabatan", cell: (info) => `${info.getValue()}${info.row.original.isTeacher ? " · Guru" : ""}` }),
  col.accessor("employmentType", { id: "type", header: "Kepegawaian", cell: (info) => EMPLOYMENT_TYPE_LABELS[info.getValue()] }),
  col.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <Badge variant={info.getValue() === "ACTIVE" ? "default" : "secondary"}>{info.getValue() === "ACTIVE" ? "Aktif" : "Nonaktif"}</Badge>,
  }),
]);

export function EmployeesTable(props: { data: EmployeeListItem[]; total: number; page: number; pageSize: number; searchParams: SearchParamsRecord }) {
  return (
    <DataTable
      {...props}
      columns={columns}
      basePath="/admin/employees"
      sortable={{ name: "name", employeeNumber: "employeeNumber" }}
      mobileHidden={["employeeNumber", "type"]}
      caption="Daftar pegawai"
    />
  );
}
