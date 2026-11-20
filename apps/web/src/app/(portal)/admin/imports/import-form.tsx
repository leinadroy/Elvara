"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { STUDENT_IMPORT_COLUMNS, STUDENT_IMPORT_REQUIRED, type ImportBatchDetail } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";
import { xlsxToCsv } from "@/lib/xlsx-to-csv";
import { ImportRowsTable } from "./import-rows";

const TEMPLATE = `${STUDENT_IMPORT_COLUMNS.join(",")}\n2026101,Nama Siswa,L,2013-05-01,Bandung,0123456789,,081200000000\n`;

export function ImportStudentsForm() {
  const router = useRouter();
  const form = useApiForm();
  const fileId = useId();
  const [result, setResult] = useState<ImportBatchDetail | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const file = (new FormData(e.currentTarget).get("file") as File | null) ?? null;
    if (!file || file.size === 0) {
      form.setError({ code: "VALIDATION_FAILED", message: "Pilih file CSV atau Excel terlebih dahulu.", requestId: "-" });
      return;
    }
    let content: string;
    try {
      content = file.name.toLowerCase().endsWith(".xlsx") ? await xlsxToCsv(file) : await file.text();
    } catch {
      form.setError({ code: "VALIDATION_FAILED", message: "File Excel tidak dapat dibaca. Simpan ulang sebagai .xlsx atau CSV.", requestId: "-" });
      return;
    }
    const res = await form.run<ImportBatchDetail>({ values: { fileName: file.name, content }, send: (v) => apiSend("POST", "/imports/students", v) });
    if (res) {
      setResult(res);
      router.refresh();
    }
  }

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`;

  return (
    <div className="flex flex-col gap-4">
      <form method="post" onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-3 rounded-lg border p-4">
        <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
        {form.fieldErrors.content && (
          <ul className="list-disc pl-5 text-sm text-destructive">
            {form.fieldErrors.content.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fileId} className="text-sm font-medium">
            File CSV atau Excel <span className="text-destructive">*</span>
          </label>
          <input id={fileId} name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1" />
          <p className="text-xs text-muted-foreground">
            Kolom: <code>{STUDENT_IMPORT_COLUMNS.join(", ")}</code>. Wajib: <code>{STUDENT_IMPORT_REQUIRED.join(", ")}</code>. CSV memakai pemisah koma atau titik koma; untuk Excel (.xlsx) dipakai lembar pertama dengan header yang sama; jenis kelamin L/P; tanggal YYYY-MM-DD. Maks. 2.000 baris.{" "}
            <a href={templateHref} download="templat-impor-siswa.csv" className="underline">
              Unduh templat
            </a>
          </p>
        </div>
        <div>
          <Button type="submit" disabled={form.pending}>
            {form.pending ? "Mengimpor…" : "Impor"}
          </Button>
        </div>
      </form>
      {result && (
        <section role="status" aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm">
            <span className="font-medium">Hasil impor:</span> {result.createdCount} siswa dibuat, {result.skippedCount} dilewati karena sudah ada,{" "}
            <span className={result.errorCount ? "font-medium text-destructive" : ""}>{result.errorCount} baris bermasalah</span>.
            {result.isRepeat && " File ini identik dengan impor sebelumnya."}
          </p>
          <ImportRowsTable rows={result.rows} />
        </section>
      )}
    </div>
  );
}
