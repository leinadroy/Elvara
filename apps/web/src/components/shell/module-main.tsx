"use client";

import { usePathname } from "next/navigation";
import { MODULES, moduleFor } from "@/lib/modules";

/** Label modul untuk eyebrow judul halaman ("SMART SCHOOL / ADMINISTRASI SEKOLAH"). Dibungkus <Suspense> oleh pemanggil. */
export function ModuleEyebrowLabel() {
  return <>{MODULES[moduleFor(usePathname())].label}</>;
}
