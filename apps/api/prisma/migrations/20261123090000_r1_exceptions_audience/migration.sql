-- CreateEnum
CREATE TYPE "ScheduleExceptionKind" AS ENUM ('CANCELLED', 'SUBSTITUTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AudienceKind" ADD VALUE 'BUILDING';
ALTER TYPE "AudienceKind" ADD VALUE 'ROLE';

-- AlterTable
ALTER TABLE "announcement" ADD COLUMN     "audienceRole" "RoleKey",
ADD COLUMN     "buildingId" UUID;

-- CreateTable
CREATE TABLE "schedule_exception" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "timetableSlotId" UUID NOT NULL,
    "exceptionDate" DATE NOT NULL,
    "kind" "ScheduleExceptionKind" NOT NULL,
    "substituteEmployeeId" UUID,
    "roomId" UUID,
    "reason" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_exception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_exception_schoolId_exceptionDate_idx" ON "schedule_exception"("schoolId", "exceptionDate");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exception_timetableSlotId_exceptionDate_key" ON "schedule_exception"("timetableSlotId", "exceptionDate");

-- AddForeignKey
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_timetableSlotId_fkey" FOREIGN KEY ("timetableSlotId") REFERENCES "timetable_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_substituteEmployeeId_fkey" FOREIGN KEY ("substituteEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

