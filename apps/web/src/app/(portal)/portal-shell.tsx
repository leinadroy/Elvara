import Link from "next/link";
import { Suspense } from "react";
import type { DashboardSummary } from "@smart-school/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalSearch } from "@/components/shell/global-search";
import { Logo } from "@/components/shell/icons";
import { NavMenu } from "@/components/shell/nav-menu";
import { SidebarToggle } from "@/components/shell/sidebar-controls";
import { ThemeSwitcher } from "@/components/shell/theme-switcher";
import { RoleSwitcher, UserMenu } from "@/components/shell/user-menu";
import { Widget } from "@/components/shell/widget";
import { apiGet, getMe } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { menuFor } from "@/lib/menu";

/** Header: kiri logo + cari, kanan tema, ganti peran, dan menu pengguna. */
export async function PortalHeader() {
  const me = await getMe();
  return (
    <>
      <div className="flex items-center gap-1">
        <SidebarToggle side="left" />
        <Link href="/dashboard" className="hidden rounded-md px-1 sm:block" aria-label="Smart School, ke beranda">
          <Logo />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 justify-center px-2">
        <GlobalSearch menu={menuFor(me)} />
      </div>
      <div className="flex items-center gap-1">
        <ThemeSwitcher />
        <RoleSwitcher roles={me.roles} activeRole={me.activeRole} />
        <UserMenu me={me} />
        <SidebarToggle side="right" />
      </div>
    </>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="flex w-full items-center justify-between gap-4" role="status" aria-label="Memuat header">
      <Logo />
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}

/** Widget menu utama (atas) per peran. */
export async function MainMenuWidget() {
  const me = await getMe();
  return (
    <Widget id="menu" title="Menu utama">
      <NavMenu items={menuFor(me)} />
    </Widget>
  );
}

/** Widget informasi sekolah (bawah): tahun ajaran dan semester berjalan. */
async function SchoolInfo() {
  const res = await apiGet<DashboardSummary>("/dashboard/summary");
  if (!res.ok) return <p className="px-1 text-sm text-muted-foreground">Informasi belum dapat dimuat.</p>;
  const y = res.data.academicYear;
  return (
    <dl className="flex flex-col gap-2 px-1 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Tahun ajaran aktif</dt>
        <dd className="font-medium">{y ? y.name : "Belum ada"}</dd>
        {y && (
          <dd className="text-xs text-muted-foreground">
            {formatDate(y.startDate)} – {formatDate(y.endDate)}
          </dd>
        )}
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Semester berjalan</dt>
        <dd className="font-medium">{res.data.currentTermName ?? "Di luar masa semester"}</dd>
      </div>
    </dl>
  );
}

export function SchoolInfoWidget() {
  return (
    <Widget id="school-info" title="Informasi sekolah">
      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <SchoolInfo />
      </Suspense>
    </Widget>
  );
}
