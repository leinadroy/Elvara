"use client";

import { Download, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { DOCUMENT_CATEGORY_LABELS, UploadDocumentSchema, type ApiError, type PersonDocumentView } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/actions";
import { FormErrorSummary, SelectField, TextField, toOptions, type FieldErrors } from "@/components/form";
import { EmptyState } from "@/components/page-states";
import { formatDateTime } from "@/lib/format";

const MAX_MB = 5;

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Dokumen pribadi seseorang: baris dokumen (unduh/hapus) dan formulir unggah.
 * File dikirim multipart ke API; unduhan lewat API yang memeriksa hak dan mencatat audit.
 */
export function DocumentsPanel({ personId, documents, canManage }: { personId: string; documents: PersonDocumentView[]; canManage: boolean }) {
  const router = useRouter();
  const fileId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    const meta = UploadDocumentSchema.safeParse({ category: fd.get("category"), title: fd.get("title") });
    const fe: FieldErrors = {};
    if (!meta.success) for (const i of meta.error.issues) (fe[String(i.path[0])] ??= []).push(i.message);
    if (!file || file.size === 0) fe.file = ["Pilih file."];
    else if (file.size > MAX_MB * 1024 * 1024) fe.file = [`Maksimal ${MAX_MB} MB.`];
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      setError({ code: "VALIDATION_FAILED", message: "Periksa kembali isian yang ditandai.", requestId: "-" });
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/v1/people/${personId}/documents`, { method: "POST", body: fd, credentials: "same-origin" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null;
        setError(body ?? { code: "ERROR", message: `Unggah gagal (HTTP ${res.status}).`, requestId: "-" });
        setFieldErrors(body?.fieldErrors ?? {});
        return;
      }
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError({ code: "NETWORK", message: "Koneksi terputus. Coba lagi.", requestId: "-" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.length === 0 ? (
        <EmptyState title="Belum ada dokumen" description="Dokumen pribadi disimpan privat dan hanya bisa diunduh petugas berwenang atau pemilik data." />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <FileText aria-hidden="true" className="size-5 shrink-0 text-[var(--module)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {DOCUMENT_CATEGORY_LABELS[d.category]} · {d.originalName} · {size(d.sizeBytes)} · {formatDateTime(d.createdAt)}
                  {d.uploadedBy && ` · oleh ${d.uploadedBy}`}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={`/api/v1/documents/${d.id}/content`} className="inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                  <Download className="size-3.5" /> Unduh
                </a>
                {canManage && (
                  <ActionButton method="DELETE" path={`/documents/${d.id}`} label="Hapus" variant="destructive" confirm={`Hapus dokumen "${d.title}"? Isi file ikut dihapus dari penyimpanan.`} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form ref={formRef} method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
          <p className="font-medium">Unggah dokumen</p>
          <FormErrorSummary error={error} fieldErrors={fieldErrors} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField name="category" label="Kategori" required placeholder="Pilih kategori" options={toOptions(DOCUMENT_CATEGORY_LABELS)} errors={fieldErrors} />
            <TextField name="title" label="Judul" required errors={fieldErrors} placeholder="mis. Kartu keluarga 2026" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor={fileId} className="text-sm font-medium">
                File <span className="text-destructive">*</span>
              </label>
              <input id={fileId} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-invalid={fieldErrors.file ? true : undefined} className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1" />
              <p className={`text-xs ${fieldErrors.file ? "text-destructive" : "text-muted-foreground"}`}>{fieldErrors.file?.join(" ") ?? `PDF, JPG, atau PNG. Maks. ${MAX_MB} MB.`}</p>
            </div>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Mengunggah…" : "Unggah"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
