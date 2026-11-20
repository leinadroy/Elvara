import Link from "next/link";
import type { ReactNode } from "react";
import type { ApiError } from "@smart-school/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { ModuleEyebrowLabel } from "@/components/shell/module-main";

/**
 * Judul halaman bergaya infografis: eyebrow modul berwarna, garis tipis, judul tebal besar, keterangan abu.
 */
export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <p className="text-xs font-bold tracking-wider text-[var(--module)] uppercase">
          Smart School <span aria-hidden="true">/</span>{" "}
          <Suspense fallback={null}>
            <ModuleEyebrowLabel />
          </Suspense>
        </p>
        {back && (
          <Link href={back.href} className="text-xs font-medium text-muted-foreground hover:text-foreground">
            ← {back.label}
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Chip berbentuk pil dengan titik warna modul, seperti daftar "pemeran" di infografis. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[var(--module-tint)] px-2.5 py-0.5 text-xs font-semibold">
      <span aria-hidden="true" className="size-2 rounded-full bg-[var(--module)]" />
      {children}
    </span>
  );
}

/** Keadaan gagal dari API: akses ditolak dibedakan dari kesalahan lain, requestId selalu tampil untuk dukungan. */
export function ApiErrorState({ status, error }: { status: number; error: ApiError }) {
  const denied = status === 403;
  return (
    <Alert variant={denied ? "default" : "destructive"}>
      <AlertTitle>{denied ? "Akses ditolak" : "Data tidak dapat dimuat"}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {!denied && (
          <p className="mt-1 text-xs">
            Kode permintaan: <code className="font-mono">{error.requestId}</code>.{" "}
            <Link href="" className="underline">
              Muat ulang
            </Link>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Kerangka saat memuat: menjaga struktur halaman agar tidak melompat. */
export function LoadingBlock({ rows = 6, label = "Memuat data…" }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LinkButton({ href, children, variant = "default" }: { href: string; children: ReactNode; variant?: "default" | "outline" | "secondary" | "ghost" }) {
  return (
    <Link href={href} className={buttonVariants({ variant })}>
      {children}
    </Link>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd className="text-sm">{it.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
