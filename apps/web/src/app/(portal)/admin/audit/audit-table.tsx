"use client";

import type { AuditEventView } from "@smart-school/contracts";
import { DataTable, columnHelper, type SearchParamsRecord } from "@/components/data-table";
import { formatDateTime } from "@/lib/format";

const col = columnHelper<AuditEventView>();
const columns = col.columns([
  col.accessor("createdAt", { id: "time", header: "Waktu", cell: (info) => <span className="whitespace-nowrap">{formatDateTime(info.getValue())}</span> }),
  col.accessor("action", { id: "action", header: "Aksi", cell: (info) => <code className="text-xs">{info.getValue()}</code> }),
  col.accessor((row) => row.actor?.email ?? "Sistem / tanpa akun", { id: "actor", header: "Pelaku" }),
  col.accessor((row) => (row.entityType ? `${row.entityType} ${row.entityId?.slice(0, 8) ?? ""}` : "—"), {
    id: "entity",
    header: "Objek",
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  col.accessor("metadata", {
    id: "detail",
    header: "Rincian",
    cell: (info) => {
      const json = JSON.stringify(info.getValue());
      return json === "{}" ? "—" : <span className="block max-w-xs truncate font-mono text-xs" title={json}>{json}</span>;
    },
  }),
]);

export function AuditTable(props: { data: AuditEventView[]; total: number; page: number; pageSize: number; searchParams: SearchParamsRecord }) {
  return <DataTable {...props} columns={columns} basePath="/admin/audit" mobileHidden={["entity", "detail"]} caption="Log audit" />;
}
