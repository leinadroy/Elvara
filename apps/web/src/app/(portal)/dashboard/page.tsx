import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/page-states";
import { homeFor } from "@/lib/areas";
import { getMe } from "@/lib/api-server";

export const metadata: Metadata = { title: "Beranda" };

async function ToArea(): Promise<never> {
  const me = await getMe();
  redirect(homeFor(me.activeRole));
}

/** /dashboard mengalihkan ke beranda area peran aktif (/<area>/dashboard). */
export default function DashboardRedirect() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <ToArea />
    </Suspense>
  );
}
