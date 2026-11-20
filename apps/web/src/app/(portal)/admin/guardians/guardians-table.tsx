"use client";

import type { GuardianListItem } from "@smart-school/contracts";
import { DataTable, columnHelper, type SearchParamsRecord } from "@/components/data-table";

const col = columnHelper<GuardianListItem>();
const columns = col.columns([
  col.accessor("fullName", { id: "name", header: "Nama", cell: (info) => <span className="font-medium">{info.getValue()}</span> }),
  col.accessor("email", { id: "email", header: "Email", cell: (info) => info.getValue() ?? <span className="text-muted-foreground">Belum diisi</span> }),
  col.accessor("phone", { id: "phone", header: "Telepon", cell: (info) => info.getValue() ?? "—" }),
  col.accessor("childCount", { id: "children", header: "Anak tertaut" }),
]);

export function GuardiansTable(props: { data: GuardianListItem[]; total: number; page: number; pageSize: number; searchParams: SearchParamsRecord }) {
  return <DataTable {...props} columns={columns} basePath="/admin/guardians" mobileHidden={["phone"]} caption="Daftar orang tua / wali" />;
}
