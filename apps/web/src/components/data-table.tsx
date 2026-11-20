"use client";

import Link from "next/link";
import { createColumnHelper, tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";

/** TanStack Table v9: hanya fitur inti; paginasi dan urutan dikerjakan server lewat URL. */
export const listFeatures = tableFeatures({});
type ListFeatures = typeof listFeatures;
export const columnHelper = <T extends object>() => createColumnHelper<ListFeatures, T>();
export type ListColumn<T extends object> = ColumnDef<ListFeatures, T, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type SearchParamsRecord = Record<string, string | undefined>;

export function hrefWith(basePath: string, current: SearchParamsRecord, patch: SearchParamsRecord): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * Tabel data dengan paginasi dan urutan di server. Semua state ada di URL (dapat dibagikan,
 * bertahan saat refresh, Back/Forward bekerja). Kolom yang bisa diurutkan dipetakan ke nilai `sort` API.
 */
export function DataTable<T extends object>({
  columns,
  data,
  total,
  page,
  pageSize,
  basePath,
  searchParams,
  sortable = {},
  caption,
  mobileHidden = [],
}: {
  /** Definisikan di skala modul (stabil antar render), sesuai aturan TanStack Table v9. */
  columns: ReadonlyArray<ListColumn<T>>;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: SearchParamsRecord;
  /** id kolom → nilai sort naik (mis. "name"); turun memakai awalan "-". */
  sortable?: Record<string, string>;
  caption: string;
  /** id kolom yang disembunyikan di layar kecil. */
  mobileHidden?: string[];
}) {
  const table = useTable({ features: listFeatures, columns, data });
  const currentSort = searchParams.sort;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const sortKey = sortable[h.column.id];
                  const label = <table.FlexRender header={h} />;
                  const hidden = mobileHidden.includes(h.column.id) ? "hidden md:table-cell" : "";
                  if (!sortKey) return <TableHead key={h.id} className={hidden}>{label}</TableHead>;
                  const isAsc = currentSort === sortKey;
                  const isDesc = currentSort === `-${sortKey}`;
                  return (
                    <TableHead key={h.id} className={hidden} aria-sort={isAsc ? "ascending" : isDesc ? "descending" : "none"}>
                      <Link href={hrefWith(basePath, searchParams, { sort: isAsc ? `-${sortKey}` : sortKey, page: undefined })} className="inline-flex items-center gap-1 hover:underline">
                        {label}
                        <span aria-hidden="true" className="text-muted-foreground">
                          {isAsc ? "↑" : isDesc ? "↓" : "↕"}
                        </span>
                      </Link>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={mobileHidden.includes(cell.column.id) ? "hidden md:table-cell" : ""}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          Menampilkan {from}–{to} dari {total}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={hrefWith(basePath, searchParams, { page: String(page - 1) })}>
              ← Sebelumnya
            </Link>
          ) : (
            <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"} aria-disabled="true">
              ← Sebelumnya
            </span>
          )}
          <span className="self-center text-muted-foreground">
            {page} / {lastPage}
          </span>
          {page < lastPage ? (
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={hrefWith(basePath, searchParams, { page: String(page + 1) })}>
              Berikutnya →
            </Link>
          ) : (
            <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"} aria-disabled="true">
              Berikutnya →
            </span>
          )}
        </div>
      </nav>
    </div>
  );
}
