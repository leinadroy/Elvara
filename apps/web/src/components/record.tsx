"use client";

import { ArrowLeft, RefreshCw, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import type { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, formToObject, useApiForm, type FieldErrors } from "@/components/form";
import type { ClientResult } from "@/lib/api-client";

/**
 * Halaman record (insert/edit): toolbar tetap (Kembali, Muat ulang, Batalkan perubahan, Simpan),
 * header yang selalu terbuka sebagai form, lalu tab detail di bawahnya (children `tabs`).
 * Perubahan yang belum disimpan dijaga: konfirmasi sebelum kembali/muat ulang dan peringatan saat menutup tab.
 */
export function RecordForm<T>({
  mode,
  backHref,
  backLabel,
  title,
  subtitle,
  badges,
  schema,
  booleans = [],
  submit,
  onSaved,
  readOnly = false,
  fields,
  tabs,
}: {
  mode: "insert" | "edit";
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  schema: ZodType;
  booleans?: string[];
  submit: (values: unknown) => Promise<ClientResult<T>>;
  onSaved?: (data: T) => void;
  readOnly?: boolean;
  fields: (errors: FieldErrors) => ReactNode;
  tabs?: ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useApiForm();
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const confirmDiscard = () => !dirty || window.confirm("Ada perubahan yang belum disimpan. Tinggalkan perubahan ini?");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = await form.run<T>({ schema, values: formToObject(e.currentTarget, booleans), send: submit });
    if (data === null) return;
    setDirty(false);
    setSavedAt(new Date());
    onSaved?.(data);
    router.refresh();
  }

  function cancelChanges() {
    if (!dirty || !window.confirm("Batalkan semua perubahan pada formulir ini?")) return;
    formRef.current?.reset();
    form.setError(null);
    setDirty(false);
  }

  const status = form.pending
    ? "Menyimpan…"
    : dirty
      ? "Ada perubahan yang belum disimpan"
      : savedAt
        ? `Tersimpan ${savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
        : mode === "insert"
          ? "Data baru"
          : "";

  return (
    <div className="flex flex-col gap-4">
      <div role="toolbar" aria-label="Aksi formulir" className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <Link
          href={backHref}
          onClick={(e) => {
            if (!confirmDiscard()) e.preventDefault();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
        {mode === "edit" && (
          <Button type="button" variant="ghost" size="sm" disabled={refreshing} onClick={() => confirmDiscard() && startRefresh(() => router.refresh())}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} /> Muat ulang
          </Button>
        )}
        <p aria-live="polite" className={`ml-auto text-xs ${dirty ? "font-medium text-[var(--brand-accent)]" : "text-muted-foreground"}`}>
          {status}
        </p>
        {!readOnly && (
          <>
            <Button type="button" variant="outline" size="sm" disabled={!dirty || form.pending} onClick={cancelChanges}>
              <RotateCcw /> Batalkan perubahan
            </Button>
            <Button type="submit" form={formId} size="sm" disabled={form.pending || (mode === "edit" && !dirty)}>
              <Save /> {form.pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        )}
      </div>

      <section aria-labelledby={`${formId}-title`} className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-2 bg-[var(--module)]" aria-hidden="true" />
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id={`${formId}-title`} className="text-xl font-bold">
                {title}
              </h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {badges && <div className="flex flex-wrap gap-1.5">{badges}</div>}
          </div>
          <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
          <form id={formId} ref={formRef} method="post" onSubmit={onSubmit} onInput={() => setDirty(true)} onChange={() => setDirty(true)} noValidate>
            <fieldset disabled={readOnly} className="grid gap-4 disabled:opacity-90">
              {fields(form.fieldErrors)}
            </fieldset>
          </form>
        </div>
      </section>

      {tabs}
    </div>
  );
}

/** Tab detail di bawah header. Tab aktif disimpan di URL (?tab=) agar bisa dibagikan dan bertahan saat refresh. */
export function RecordTabs({ basePath, active, tabs }: { basePath: string; active: string; tabs: { key: string; label: string; count?: number; disabled?: string }[] }) {
  return (
    <div role="tablist" aria-label="Detail" className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const selected = t.key === active;
        if (t.disabled) {
          return (
            <span key={t.key} role="tab" aria-selected="false" aria-disabled="true" title={t.disabled} className="shrink-0 cursor-not-allowed px-3 py-2 text-sm text-muted-foreground/60">
              {t.label}
            </span>
          );
        }
        return (
          <Link
            key={t.key}
            role="tab"
            aria-selected={selected}
            aria-controls="record-tabpanel"
            href={`${basePath}?tab=${t.key}`}
            scroll={false}
            replace
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${selected ? "border-[var(--module)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-full bg-[var(--module-tint)] px-1.5 text-xs text-foreground">{t.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) {
  return (
    <div id="record-tabpanel" role="tabpanel" className="flex flex-col gap-3">
      {children}
    </div>
  );
}
