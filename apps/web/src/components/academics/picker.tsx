import { Button } from "@/components/ui/button";
import { selectClass } from "@/lib/ui";

/**
 * Pemilih berbasis form GET (hasil selalu di URL, tetap berfungsi tanpa JavaScript). Parameter lain yang
 * perlu dipertahankan dikirim sebagai input tersembunyi.
 */
export function Picker({
  action,
  fields,
  keep = {},
  submitLabel = "Tampilkan",
}: {
  action: string;
  fields: { name: string; label: string; value?: string | null; options: { value: string; label: string }[]; placeholder?: string; type?: "select" | "date" }[];
  keep?: Record<string, string | undefined>;
  submitLabel?: string;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-2">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-xs text-muted-foreground">
          {f.label}
          {f.type === "date" ? (
            <input type="date" name={f.name} defaultValue={f.value ?? ""} className={`${selectClass} w-40`} />
          ) : (
            <select name={f.name} defaultValue={f.value ?? ""} className={`${selectClass} min-w-40`}>
              {f.placeholder !== undefined && <option value="">{f.placeholder}</option>}
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
      <Button type="submit" size="sm" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  );
}
