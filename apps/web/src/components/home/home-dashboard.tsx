import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { GUARDIAN_RELATIONSHIP_LABELS, ROLE_LABELS, STUDENT_STATUS_LABELS, type DashboardMetric, type DashboardSummary, type Me } from "@smart-school/contracts";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Chip, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, getMe } from "@/lib/api-server";
import { formatDate, formatDateTime } from "@/lib/format";
import { RoleWidgets } from "./r1-widgets";
import { StaleNotice } from "./stale-notice";

/** Kartu widget bergaya infografis: garis warna modul di atas, judul kecil kapital. */
export function Card({ title, children, className = "", action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`flex flex-col overflow-hidden rounded-2xl border bg-card ${className}`} aria-label={title}>
      <div aria-hidden="true" className="h-1.5 bg-[var(--module)]" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold tracking-wider text-[var(--module)] uppercase">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Daftar tindak lanjut: angka bertanda perhatian yang bernilai > 0, dengan tautan ke daftarnya. */
function Todo({ metrics }: { metrics: DashboardMetric[] }) {
  const open = metrics.filter((m) => m.warn && (m.value ?? 0) > 0 && m.href);
  if (!open.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-[var(--module)]" /> Tidak ada yang perlu ditindaklanjuti.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y">
      {open.map((m) => (
        <li key={m.key}>
          <Link href={m.href!} className="flex items-center gap-3 py-2 text-sm hover:underline">
            <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className="flex-1">{m.label}</span>
            <span className="rounded-full bg-[var(--module-tint)] px-2 text-xs font-semibold tabular-nums">{m.value}</span>
            <ArrowRight aria-hidden="true" className="size-4 opacity-50" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function YearWidget({ s }: { s: DashboardSummary }) {
  const y = s.academicYear;
  return (
    <Card title="Tahun ajaran">
      {y ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-2xl font-bold">{y.name}</p>
          <p className="text-muted-foreground">
            {formatDate(y.startDate)} – {formatDate(y.endDate)}
          </p>
          <ul className="flex flex-col gap-1">
            {y.terms.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className={t.name === s.currentTermName ? "font-semibold" : ""}>
                  {t.name}
                  {t.name === s.currentTermName && <span className="ml-1.5 text-xs text-[var(--module)]">berjalan</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(t.startDate)} – {formatDate(t.endDate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada tahun ajaran aktif.</p>
      )}
    </Card>
  );
}

function SecurityNudge({ s }: { s: DashboardSummary }) {
  if (!s.mfa?.recommended || s.mfa.enabled) return null;
  return (
    <Link href="/me/security#mfa" className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-accent p-4 text-sm text-accent-foreground hover:underline">
      <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex-1">Peran Anda menangani data penting. Aktifkan verifikasi dua langkah untuk melindungi akun.</span>
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

/**
 * Angka R1 per peran (FR-8.8): setiap angka menampilkan definisi dan sumber datanya, dan seluruh deret
 * menampilkan waktu perhitungan.
 */
function MetricTile({ m }: { m: DashboardMetric }) {
  const alert = !!m.warn && (m.value ?? 0) > 0;
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{m.label}</span>
      <span className={`text-3xl font-bold tabular-nums ${alert ? "text-primary" : ""}`}>
        {m.value === null ? "—" : m.unit === "%" ? `${m.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : m.value}
      </span>
      {(m.note || alert) && <span className="text-xs text-muted-foreground">{[alert ? "Perlu perhatian" : null, m.note].filter(Boolean).join(" · ")}</span>}
    </>
  );
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      {m.href ? (
        <Link href={m.href} className="flex flex-col gap-1 hover:underline">
          {body}
        </Link>
      ) : (
        body
      )}
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Definisi</summary>
        <p className="mt-1">{m.definition}</p>
        <p className="mt-1">
          Sumber: <code className="text-[11px]">{m.source}</code>
        </p>
      </details>
    </div>
  );
}

function Metrics({ s }: { s: DashboardSummary }) {
  if (!s.metrics?.length) return null;
  return (
    <section aria-label="Angka utama" className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {s.metrics.map((m) => (
          <MetricTile key={m.key} m={m} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Dihitung langsung dari data pada {formatDateTime(s.generatedAt)}. Muat ulang halaman untuk angka terbaru.</p>
      {s.metricsUnavailable && <StaleNotice what="Sebagian angka akademik dan absensi" />}
    </section>
  );
}

function Widgets({ me, s }: { me: Me; s: DashboardSummary }) {
  const isGuardian = me.activeRole === "GUARDIAN";
  const isAdmin = me.permissions.includes("accounts:manage");

  return (
    <>
      <SecurityNudge s={s} />
      <Metrics s={s} />

      <div className="grid gap-3 lg:grid-cols-3">
        {isAdmin && s.metrics && (
          <Card title="Perlu tindakan" className="lg:col-span-2">
            <Todo metrics={s.metrics} />
          </Card>
        )}

        <YearWidget s={s} />

        {isGuardian && (
          <Card title="Anak saya" className="lg:col-span-2">
            {s.children?.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {s.children.map((c) => (
                  <li key={c.studentId}>
                    <Link href={`/guardian/children/${c.studentId}`} className="flex flex-col gap-1 rounded-xl border p-3 hover:border-[var(--module)]">
                      <span className="font-semibold">{c.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        NIS {c.nis} · {GUARDIAN_RELATIONSHIP_LABELS[c.relationship]} · {STUDENT_STATUS_LABELS[c.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada anak dengan hubungan wali terverifikasi.</p>
            )}
          </Card>
        )}

        <RoleWidgets me={me} s={s} />

        {me.person && (
          <Card title="Data saya">
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Dokumen tersimpan</span>
                <Link href="/me?tab=dokumen" className="font-semibold hover:underline">
                  {s.myDocumentCount ?? 0}
                </Link>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Pengajuan koreksi</span>
                <Link href="/me?tab=koreksi" className="font-semibold hover:underline">
                  {s.pendingMyCorrection ? "Menunggu tinjauan" : "Tidak ada"}
                </Link>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Verifikasi dua langkah</span>
                <Link href="/me/security#mfa" className="font-semibold hover:underline">
                  {s.mfa?.enabled ? "Aktif" : "Belum aktif"}
                </Link>
              </li>
            </ul>
          </Card>
        )}

        {s.recentAudit && (
          <Card title="Aktivitas terbaru" className="lg:col-span-2" action={<Link href="/admin/audit" className="text-xs underline">Semua</Link>}>
            <ul className="flex flex-col divide-y text-sm">
              {s.recentAudit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <code className="text-xs">{a.action}</code>
                  <span className="text-xs text-muted-foreground">
                    {a.actorEmail ?? "Sistem"} · {formatDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}


async function DashboardContent() {
  const [me, res] = await Promise.all([getMe(), apiGet<DashboardSummary>("/dashboard/summary")]);
  // Bila ringkasan gagal, widget lain (jadwal, absensi, pengumuman) tetap dimuat dari sumbernya masing-masing.
  const fallback: DashboardSummary = { academicYear: null, currentTermName: null, generatedAt: "" };
  return (
    <>
      <PageHeader
        title={`Halo, ${me.person?.fullName ?? me.user.email}`}
        description={
          <>
            {me.school.name} · <Chip>{ROLE_LABELS[me.activeRole]}</Chip>
          </>
        }
      />
      {res.ok ? (
        <Widgets me={me} s={res.data} />
      ) : (
        <>
          <StaleNotice what={`Ringkasan sekolah (kode ${res.error.requestId})`} />
          <div className="grid gap-3 lg:grid-cols-3">
            <RoleWidgets me={me} s={fallback} />
          </div>
        </>
      )}
    </>
  );
}

/** Beranda bersama: widget umum + widget R1 sesuai peran aktif. */
export function HomeDashboard() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <DashboardContent />
    </Suspense>
  );
}
