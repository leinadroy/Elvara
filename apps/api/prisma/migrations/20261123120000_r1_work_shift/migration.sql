-- CreateEnum
CREATE TYPE "WorkShiftStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work_shift" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "roomId" UUID,
    "status" "WorkShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "note" TEXT,
    "cancelReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_shift_employeeId_startsAt_idx" ON "work_shift"("employeeId", "startsAt");

-- CreateIndex
CREATE INDEX "work_shift_schoolId_startsAt_idx" ON "work_shift"("schoolId", "startsAt");

-- AddForeignKey
ALTER TABLE "work_shift" ADD CONSTRAINT "work_shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_shift" ADD CONSTRAINT "work_shift_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Tugas berakhir setelah mulai.
ALTER TABLE "work_shift" ADD CONSTRAINT "work_shift_time_range" CHECK ("endsAt" > "startsAt");
-- Alasan wajib bila dibatalkan.
ALTER TABLE "work_shift" ADD CONSTRAINT "work_shift_cancel_reason" CHECK ("status" <> 'CANCELLED' OR "cancelReason" IS NOT NULL);
