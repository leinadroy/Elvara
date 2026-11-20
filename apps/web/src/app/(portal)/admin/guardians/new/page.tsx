import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { GuardianForm } from "./guardian-form";

export const metadata: Metadata = { title: "Tambah wali" };

/** `next` hanya path internal (kembali ke detail siswa setelah wali dibuat). */
async function FormWithNext({ searchParams }: { searchParams: PageProps<"/admin/guardians/new">["searchParams"] }) {
  const { next } = await searchParams;
  const safe = typeof next === "string" && next.startsWith("/admin/") ? next : "/admin/guardians";
  return <GuardianForm next={safe} />;
}

export default function NewGuardianPage({ searchParams }: PageProps<"/admin/guardians/new">) {
  return (
    <>
      <PageHeader
        title="Tambah orang tua / wali"
        back={{ href: "/admin/guardians", label: "Daftar wali" }}
        description="Email wajib diisi karena undangan verifikasi dikirim ke email ini."
      />
      {/* Fallback sengaja bukan form: isian di form sementara akan hilang saat konten asli tiba. */}
      <Suspense fallback={<LoadingBlock rows={6} label="Menyiapkan formulir…" />}>
        <FormWithNext searchParams={searchParams} />
      </Suspense>
    </>
  );
}
