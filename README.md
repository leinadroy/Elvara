# Smart School

Platform manajemen sekolah terpadu. Kebutuhan produk dan cakupan rilis ada di [`docs/prd.md`](docs/prd.md). Rancangan produk dan teknis ada di [`docs/`](docs/smart_school_management_ecosystem.md); catatan induknya di [`docs/smart_school_master_note.md`](docs/smart_school_master_note.md).

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

- Node.js 22 atau lebih baru
- **npm 11** (npm 10 bawaan Node 22 gagal resolve dependency workspace ini). Jalankan perintah lewat `npx npm@11 …`, atau pasang sekali dengan `npm install -g npm@11`.
- Docker Desktop untuk PostgreSQL lokal

## Menjalankan

```bash
npm install
npm run db:up                       # PostgreSQL di localhost:5432
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run dev                         # contracts (watch) + API :4000 + web :3000
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health

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
- Skema Prisma belum berisi model domain: model ditambahkan per modul setelah keputusan di dokumen rancangan bagian 11 disepakati.
