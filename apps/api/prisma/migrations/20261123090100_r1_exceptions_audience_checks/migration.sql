-- Aturan tambahan untuk audiens pengumuman dan pengecualian jadwal (dipisah agar nilai enum baru sudah ter-commit).
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_building_audience" CHECK (("audienceKind" = 'BUILDING') = ("buildingId" IS NOT NULL));
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_role_audience" CHECK (("audienceKind" = 'ROLE') = ("audienceRole" IS NOT NULL));
-- Pertemuan yang diganti wajib menyebut guru pengganti atau ruang pengganti.
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_substitute" CHECK ("kind" <> 'SUBSTITUTED' OR "substituteEmployeeId" IS NOT NULL OR "roomId" IS NOT NULL);
