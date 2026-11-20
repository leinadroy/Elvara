import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/lib/ui";

type Filter = { name: string; label: string; options: readonly { value: string; label: string }[]; allLabel: string };

/**
 * Pencarian dan filter sebagai form GET biasa: hasilnya selalu di URL dan tetap berfungsi tanpa JavaScript.
 * Halaman kembali ke 1 setiap kali filter berubah.
 */
export function ListToolbar({
  basePath,
  searchParams,
  searchLabel,
  filters = [],
  hideSearch = false,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  searchLabel: string;
  filters?: Filter[];
  hideSearch?: boolean;
}) {
  const active = [searchParams.q, ...filters.map((f) => searchParams[f.name])].filter(Boolean).length;
  return (
    <form method="get" action={basePath} role="search" className="flex flex-col gap-2 sm:flex-row sm:items-end">
      {!hideSearch && (
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="list-q" className="text-xs text-muted-foreground">
            {searchLabel}
          </label>
          <Input id="list-q" name="q" type="search" defaultValue={searchParams.q ?? ""} />
        </div>
      )}
      {filters.map((f) => (
        <div key={f.name} className="flex flex-col gap-1 sm:w-44">
          <label htmlFor={`list-${f.name}`} className="text-xs text-muted-foreground">
            {f.label}
          </label>
          <select id={`list-${f.name}`} name={f.name} defaultValue={searchParams[f.name] ?? ""} className={selectClass}>
            <option value="">{f.allLabel}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {searchParams.sort && <input type="hidden" name="sort" value={searchParams.sort} />}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {active > 0 && (
          <Link href={basePath} className="self-center text-sm text-muted-foreground underline">
            Hapus filter ({active})
          </Link>
        )}
      </div>
    </form>
  );
}
