import { Suspense } from "react";
import { LinkButton } from "@/components/page-states";
import { ApiStatus, ApiStatusFallback } from "@/components/api-status";

const READY = [
  { title: "Admin sekolah", text: "Data siswa, pegawai, wali, akun, gedung dan ruang, tahun ajaran, impor CSV, log audit." },
  { title: "Orang tua / wali", text: "Verifikasi lewat tautan undangan, lalu lihat data anak yang terverifikasi." },
  { title: "Pegawai & siswa", text: "Masuk dengan akun undangan dan lihat profil sendiri." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Platform manajemen sekolah terpadu</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Smart School</h1>
        <p className="max-w-2xl text-muted-foreground">Satu data untuk seluruh sekolah. Setiap orang melihat bagiannya sendiri.</p>
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href="/login">Masuk</LinkButton>
          <Suspense fallback={<ApiStatusFallback />}>
            <ApiStatus />
          </Suspense>
        </div>
      </header>

      <section aria-labelledby="tersedia" className="flex flex-col gap-4">
        <h2 id="tersedia" className="text-lg font-semibold">
          Sudah tersedia (R0 Fondasi)
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {READY.map((r) => (
            <li key={r.title} className="rounded-xl p-4 ring-1 ring-foreground/10">
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
