"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import type { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, formToObject, useApiForm, type FieldErrors } from "@/components/form";
import { apiSend } from "@/lib/api-client";

/**
 * Form kecil untuk menambah/mengubah data di halaman daftar: validasi skema di browser, kirim ke API,
 * lalu muat ulang data server. Input tidak hilang bila gagal; dikosongkan bila berhasil (resetOnSuccess).
 */
export function InlineForm<T = unknown>({
  method = "POST",
  path,
  schema,
  submitLabel,
  fields,
  booleans = [],
  transform,
  resetOnSuccess = true,
  onSuccess,
  className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
}: {
  method?: "POST" | "PUT" | "PATCH";
  path: string;
  schema?: ZodType;
  submitLabel: string;
  fields: (errors: FieldErrors) => ReactNode;
  booleans?: string[];
  transform?: (values: Record<string, unknown>) => unknown;
  resetOnSuccess?: boolean;
  onSuccess?: (data: T) => void;
  className?: string;
}) {
  const router = useRouter();
  const form = useApiForm();
  const ref = useRef<HTMLFormElement>(null);
  const [done, setDone] = useState<string | null>(null);
  return (
    <form
      ref={ref}
      method="post"
      noValidate
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setDone(null);
        const raw = formToObject(e.currentTarget, booleans);
        const data = await form.run<T>({ schema, values: transform ? transform(raw) : raw, send: (v) => apiSend<T>(method, path, v) });
        if (data === null) return;
        if (resetOnSuccess) ref.current?.reset();
        setDone("Tersimpan.");
        onSuccess?.(data);
        router.refresh();
      }}
    >
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      <div className={className}>{fields(form.fieldErrors)}</div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={form.pending}>
          {form.pending ? "Menyimpan…" : submitLabel}
        </Button>
        {done && (
          <span role="status" className="text-xs text-muted-foreground">
            {done}
          </span>
        )}
      </div>
    </form>
  );
}
