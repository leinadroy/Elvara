import Link from "next/link";
import type { ImportBatchDetail } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";

const LABEL = { CREATED: "Dibuat", SKIPPED: "Dilewati", ERROR: "Bermasalah" } as const;

/** Bermasalah ditampilkan lebih dulu agar mudah diperbaiki. */
export function ImportRowsTable({ rows }: { rows: ImportBatchDetail["rows"] }) {
  const order = { ERROR: 0, SKIPPED: 1, CREATED: 2 } as const;
  const sorted = [...rows].sort((a, b) => order[a.status] - order[b.status] || a.rowNumber - b.rowNumber);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">Hasil per baris</caption>
        <thead className="border-b text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Baris</th>
            <th className="px-3 py-2 font-medium">Hasil</th>
            <th className="px-3 py-2 font-medium">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.rowNumber} className="border-b last:border-0 align-top">
              <td className="px-3 py-2 tabular-nums">{r.rowNumber}</td>
              <td className="px-3 py-2">
                <Badge variant={r.status === "ERROR" ? "destructive" : r.status === "CREATED" ? "default" : "secondary"}>{LABEL[r.status]}</Badge>
              </td>
              <td className="px-3 py-2">
                {r.message ?? ""}
                {r.entityId && (
                  <Link href={`/admin/students/${r.entityId}`} className="ml-1 underline">
                    Lihat siswa
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
