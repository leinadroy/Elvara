import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/page-states";
import { ROLE_AREA, homeFor } from "@/lib/areas";
import { getMe } from "@/lib/api-server";
import { HomeDashboard } from "./home-dashboard";

async function Guard({ area }: { area: string }) {
  const me = await getMe();
  if (ROLE_AREA[me.activeRole].area !== area) redirect(homeFor(me.activeRole));
  return <HomeDashboard />;
}

/** Beranda area: bila area tidak sesuai peran aktif, alihkan ke beranda peran aktif. */
export function areaDashboard(area: string) {
  return function AreaDashboardPage() {
    return (
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Guard area={area} />
      </Suspense>
    );
  };
}
