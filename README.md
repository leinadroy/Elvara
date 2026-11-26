# Elvara School Ecosystem

Platform manajemen sekolah terpadu (nama kerja repo: Smart School). Kebutuhan produk dan cakupan rilis ada di [`docs/prd.md`](docs/prd.md). Rancangan produk dan teknis ada di [`docs/`](docs/smart_school_management_ecosystem.md); catatan induknya di [`docs/smart_school_master_note.md`](docs/smart_school_master_note.md).

## Struktur

```text
apps/web/              Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Table
apps/api/              NestJS 12 (modular monolith, ESM) + Prisma 7 + PostgreSQL
packages/contracts/    Skema Zod dan tipe DTO yang dipakai web dan API
packages/config/       tsconfig dasar bersama
docs/                  Rancangan produk, per modul, dan infografis
scripts/               Generator catatan induk dan infografis (Python)
```

## Prasyarat

- Node.js 22.22.3+, 24.15.0+, atau 26+ (sesuai kebutuhan dependensi saat ini)
- **npm 11** (npm 10 bawaan Node 22 gagal resolve dependency workspace ini). Jalankan perintah lewat `npx npm@11 …`, atau pasang sekali dengan `npm install -g npm@11`.
- **Tidak perlu Docker untuk development.** `prisma dev` menjalankan database lokal berbasis PGlite yang kompatibel dengan protokol PostgreSQL. Untuk pilot/produksi, gunakan server PostgreSQL sungguhan.

## Menjalankan

```bash
npm ci
npm run db:up                       # 2 database PGlite lokal terpisah: smart-school (dev) & smart-school-test (tes)
cp apps/api/.env.example apps/api/.env      # cocokkan URL dengan yang ditampilkan db:up
cp apps/web/.env.example apps/web/.env.local
npm run db:deploy -w api            # terapkan migrasi
npm run db:seed                     # generate Prisma Client lalu isi data contoh sintetis
npm run dev                         # contracts (watch) + API :4000 + web :3000
```

Hentikan database dengan `npm run db:down`; lihat status dan URL-nya dengan `npm run db:status -w api`.

**Masuk pertama kali:** buka http://localhost:3000/login dan pakai akun contoh dari `apps/api/prisma/seed.ts` (admin, kurikulum, kepala sekolah, guru, staf, siswa, wali). Akun lain dibuat lewat tautan undangan dari halaman siswa/pegawai.

**Port bentrok?** Bila port 4000 dipakai aplikasi lain, ubah `PORT` di `apps/api/.env` dan `API_URL` di `apps/web/.env.local` ke port yang sama (mis. 4100). Web meneruskan `/api/v1/*` ke `API_URL`, jadi browser cukup mengakses port 3000.

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health (status database dan job terjadwal)
- Dokumentasi API (OpenAPI, hanya di luar produksi): http://localhost:4000/api/v1/docs, JSON di `/api/v1/docs-json`

## Perintah lain

| Perintah | Kegunaan |
| --- | --- |
| `npm run build` | Build contracts, API, lalu web |
| `npm run typecheck` / `npm run lint` / `npm test` | Pemeriksaan semua workspace |
| `npm run test:e2e -w api` | Tes e2e API |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio |
| `npm run docs:build` | Gabungkan dokumen modul ke catatan induk |

## Konvensi yang sudah dipasang

- Semua endpoint di bawah `/api/v1`.
- Setiap respons membawa header `x-request-id`; kesalahan memakai format `{ code, message, requestId, fieldErrors? }` (`packages/contracts`).
- Env API divalidasi saat start; aplikasi gagal start bila `DATABASE_URL` tidak valid.
- Skema database R0 dan R1 dijelaskan di [`docs/r0-data-model.md`](docs/r0-data-model.md); keputusan produk/arsitektur di [`docs/adr/`](docs/adr/README.md).
- Log API: satu baris per permintaan (requestId, metode, path tanpa query, status, durasi, pengguna). Format JSON di produksi atau dengan `LOG_JSON=true`.
- Job terjadwal (finalisasi absensi tiap 10 menit) melapor ke `/api/v1/health`; status `degraded` bila job gagal atau berhenti.
