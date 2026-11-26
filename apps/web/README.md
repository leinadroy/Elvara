# Web Elvara

Next.js App Router untuk tujuh area peran. API berada di `apps/api`; kontrak tipe dan validasi bersama ada di `packages/contracts`. Petunjuk setup lengkap ada di [README monorepo](../../README.md).

Salin `.env.example` ke `.env.local` dan atur `API_URL`, lalu jalankan dari root repo:

```bash
npm run dev:web
```

Buka `http://localhost:3000/login`. Guru dapat membuat penilaian di `/teacher/assessments`, lalu mengisi nilai, menerbitkan, dan mengoreksi nilai terbit dengan alasan melalui `/teacher/assessments/[assessmentId]`. Nilai terbit tampil bagi siswa di `/student/grades` dan wali berizin di `/guardian/grades`.

```bash
npm run typecheck -w web
npm run lint -w web
npm run build -w web
```

Jika Turbopack gagal membuat subprocess pada lingkungan Windows tertentu, verifikasi build dengan `npm exec -w web -- next build --webpack`.
