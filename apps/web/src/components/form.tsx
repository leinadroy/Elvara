"use client";

import { useId, useState, type ReactNode } from "react";
import type { ApiError } from "@smart-school/contracts";
import type { ZodType } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClientResult } from "@/lib/api-client";
import { selectClass } from "@/lib/ui";

export { selectClass, toOptions } from "@/lib/ui";

export type FieldErrors = Record<string, string[]>;

/** Ubah FormData menjadi objek: string kosong → null, checkbox yang disebut → boolean. */
export function formToObject(form: HTMLFormElement, booleans: string[] = []): Record<string, unknown> {
  const data = new FormData(form);
  const out: Record<string, unknown> = {};
  for (const [key, value] of data.entries()) {
    if (booleans.includes(key)) continue;
    out[key] = typeof value === "string" && value.trim() === "" ? null : value;
  }
  for (const key of booleans) out[key] = data.get(key) === "on";
  return out;
}

/**
 * State form standar: validasi skema di browser (umpan balik cepat), lalu API sebagai sumber kebenaran.
 * Input tidak dikosongkan saat gagal, karena form memakai onSubmit, bukan action yang me-reset form.
 */
export function useApiForm() {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<ApiError | null>(null);

  async function run<T>(opts: { schema?: ZodType; values: unknown; send: (values: unknown) => Promise<ClientResult<T>> }): Promise<T | null> {
    setError(null);
    setFieldErrors({});
    let values = opts.values;
    if (opts.schema) {
      const parsed = opts.schema.safeParse(opts.values);
      if (!parsed.success) {
        const fe: FieldErrors = {};
        for (const issue of parsed.error.issues) (fe[issue.path.join(".") || "_"] ??= []).push(issue.message);
        setFieldErrors(fe);
        setError({ code: "VALIDATION_FAILED", message: "Periksa kembali isian yang ditandai.", requestId: "-" });
        return null;
      }
      values = parsed.data;
    }
    setPending(true);
    try {
      const res = await opts.send(values);
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.error.fieldErrors ?? {});
        return null;
      }
      return res.data;
    } finally {
      setPending(false);
    }
  }

  return { pending, fieldErrors, error, run, setError };
}

export function FormErrorSummary({ error, fieldErrors = {} }: { error: ApiError | null; fieldErrors?: FieldErrors }) {
  if (!error) return null;
  const general = fieldErrors._ ?? [];
  return (
    <div role="alert" aria-live="assertive" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <p className="font-medium">{error.message}</p>
      {general.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {general.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {error.requestId !== "-" && error.code !== "VALIDATION_FAILED" && (
        <p className="mt-1 text-xs opacity-80">
          Kode permintaan: <code className="font-mono">{error.requestId}</code>
        </p>
      )}
    </div>
  );
}

function FieldShell({ id, label, required, description, errors, children }: { id: string; label: string; required?: boolean; description?: string; errors?: string[]; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive"> *</span>}
      </Label>
      {children}
      {description && !errors?.length && (
        <p id={`${id}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-err`} className="text-xs text-destructive">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

type BaseProps = { name: string; label: string; errors?: FieldErrors; required?: boolean; description?: string };

export function TextField({
  name,
  label,
  errors,
  required,
  description,
  defaultValue,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
}: BaseProps & { defaultValue?: string | number | null; type?: string; autoComplete?: string; placeholder?: string; inputMode?: "numeric" | "email" | "tel" | "text" }) {
  const id = useId();
  const errs = errors?.[name];
  return (
    <FieldShell id={id} label={label} required={required} description={description} errors={errs}>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={errs?.length ? true : undefined}
        aria-describedby={errs?.length ? `${id}-err` : description ? `${id}-desc` : undefined}
      />
    </FieldShell>
  );
}

export function TextAreaField({ name, label, errors, required, description, defaultValue }: BaseProps & { defaultValue?: string | null }) {
  const id = useId();
  const errs = errors?.[name];
  return (
    <FieldShell id={id} label={label} required={required} description={description} errors={errs}>
      <Textarea id={id} name={name} defaultValue={defaultValue ?? undefined} aria-invalid={errs?.length ? true : undefined} aria-describedby={errs?.length ? `${id}-err` : undefined} />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  errors,
  required,
  description,
  defaultValue,
  options,
  placeholder,
}: BaseProps & { defaultValue?: string | null; options: readonly { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  const errs = errors?.[name];
  return (
    <FieldShell id={id} label={label} required={required} description={description} errors={errs}>
      <select id={id} name={name} required={required} defaultValue={defaultValue ?? ""} className={selectClass} aria-invalid={errs?.length ? true : undefined} aria-describedby={errs?.length ? `${id}-err` : undefined}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ name, label, defaultChecked, description }: { name: string; label: string; defaultChecked?: boolean; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-primary" />
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
    </div>
  );
}
