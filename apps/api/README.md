# API Elvara

NestJS modular monolith untuk R0–R2. Kontrak request/response ada di `packages/contracts`; skema dan migrasi ada di `prisma/`. Petunjuk setup lengkap ada di [README monorepo](../../README.md).

## Development lokal

Jalankan dari root repo:

```bash
npm ci
npm run db:up
```

Salin `.env.example` ke `.env`, cocokkan URL dari `npm run db:status -w api`, lalu:

```bash
npm run db:deploy -w api
npm run db:seed
npm run dev:api
```

`db:seed` menghasilkan Prisma Client secara otomatis dan mengisi data sintetis secara idempoten. Endpoint health: `http://localhost:4000/api/v1/health`.

## Verifikasi

```bash
npm run typecheck -w api
npm run lint -w api
npm run test:e2e -w api
```

Tes e2e memakai `TEST_DATABASE_URL` yang terpisah dan mengosongkan tabel database tes. Jangan arahkan variabel itu ke database development atau data nyata. `prisma dev` menggunakan PGlite lokal; untuk pilot gunakan PostgreSQL server.
