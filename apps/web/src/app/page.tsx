import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiStatus, ApiStatusFallback } from "@/components/api-status";

/** Tujuh beranda peran untuk MVP (docs/smart_school_master_note.md, bagian B). */
const MVP_PORTALS = [
  { title: "Admin sekolah", description: "Master data, akun, verifikasi wali, impor, arsip." },
  { title: "Manajemen", description: "Indikator sekolah, persetujuan, peringatan, laporan." },
  { title: "Kurikulum", description: "Jadwal bentrok, penugasan guru, kelengkapan nilai dan rapor." },
  { title: "Guru & wali kelas", description: "Jadwal hari ini, absensi kelas, tugas dan nilai." },
  { title: "Staf", description: "Shift, tugas, kehadiran, izin dan cuti." },
  { title: "Siswa", description: "Jadwal, tugas mendekati tenggat, pengumuman, hasil terbit." },
  { title: "Orang tua / wali", description: "Pilih anak, absensi, tagihan, pesan, izin." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Platform manajemen sekolah terpadu</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Smart School</h1>
        <p className="max-w-2xl text-muted-foreground">
          Kerangka awal monorepo. Portal di bawah adalah rencana tahap MVP dan belum dapat dibuka.
        </p>
        <Suspense fallback={<ApiStatusFallback />}>
          <ApiStatus />
        </Suspense>
      </header>

      <section aria-labelledby="mvp-portals" className="flex flex-col gap-4">
        <h2 id="mvp-portals" className="text-lg font-semibold">
          Beranda peran tahap MVP
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MVP_PORTALS.map((portal) => (
            <li key={portal.title}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{portal.title}</CardTitle>
                  <CardDescription>{portal.description}</CardDescription>
                </CardHeader>
                <div className="px-4">
                  <Badge variant="secondary">Belum dibangun</Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
