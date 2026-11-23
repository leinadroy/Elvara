-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'ENDED', 'MOVED');

-- CreateEnum
CREATE TYPE "TeachingRole" AS ENUM ('MAIN', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "TimetableStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'EXCUSED', 'SICK', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "AttendanceSessionKind" AS ENUM ('SCHEDULED', 'AD_HOC');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CorrectionDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AudienceKind" AS ENUM ('ALL', 'STAFF', 'STUDENTS', 'GUARDIANS', 'CLASS_GROUP');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('SCHEDULED', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryResult" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "grade_level" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_group" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "gradeLevelId" UUID NOT NULL,
    "programId" UUID,
    "code" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 32,
    "mainRoomId" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homeroom_assignment" (
    "id" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homeroom_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupCode" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_assignment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "teachingRole" "TeachingRole" NOT NULL DEFAULT 'MAIN',
    "weeklyPeriods" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teaching_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_period" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_version" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "TimetableStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" DATE,
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_slot" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "teachingAssignmentId" UUID NOT NULL,
    "roomId" UUID,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_attendance_session" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "timetableSlotId" UUID,
    "teachingAssignmentId" UUID,
    "sessionDate" DATE NOT NULL,
    "startsAt" TIMESTAMP(3),
    "kind" "AttendanceSessionKind" NOT NULL,
    "reason" TEXT,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "takenById" UUID NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_attendance_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_attendance_record" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "status" "AttendanceStatus",
    "note" TEXT,
    "versionNo" INTEGER NOT NULL DEFAULT 0,
    "finalizedAt" TIMESTAMP(3),
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_attendance_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_correction" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "oldStatus" "AttendanceStatus",
    "proposedStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" UUID NOT NULL,
    "decision" "CorrectionDecision" NOT NULL DEFAULT 'PENDING',
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_correction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audienceKind" "AudienceKind" NOT NULL,
    "classGroupId" UUID,
    "status" "AnnouncementStatus" NOT NULL,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_event" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempt" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "providerRef" TEXT,
    "result" "DeliveryResult" NOT NULL,
    "detail" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_receipt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemKind" TEXT NOT NULL,
    "itemId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "read_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grade_level_schoolId_code_key" ON "grade_level"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "grade_level_schoolId_ordinal_key" ON "grade_level"("schoolId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "program_schoolId_code_key" ON "program"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "class_group_academicYearId_code_key" ON "class_group"("academicYearId", "code");

-- CreateIndex
CREATE INDEX "enrollment_studentId_validFrom_idx" ON "enrollment"("studentId", "validFrom");

-- CreateIndex
CREATE INDEX "enrollment_classGroupId_validFrom_idx" ON "enrollment"("classGroupId", "validFrom");

-- CreateIndex
CREATE INDEX "homeroom_assignment_classGroupId_validFrom_idx" ON "homeroom_assignment"("classGroupId", "validFrom");

-- CreateIndex
CREATE INDEX "homeroom_assignment_employeeId_idx" ON "homeroom_assignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_schoolId_code_key" ON "subject"("schoolId", "code");

-- CreateIndex
CREATE INDEX "teaching_assignment_employeeId_termId_idx" ON "teaching_assignment"("employeeId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_assignment_termId_classGroupId_subjectId_employeeI_key" ON "teaching_assignment"("termId", "classGroupId", "subjectId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_period_schoolId_sequence_key" ON "lesson_period"("schoolId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_version_termId_classGroupId_versionNo_key" ON "timetable_version"("termId", "classGroupId", "versionNo");

-- CreateIndex
CREATE INDEX "timetable_slot_versionId_weekday_idx" ON "timetable_slot"("versionId", "weekday");

-- CreateIndex
CREATE INDEX "student_attendance_session_classGroupId_sessionDate_idx" ON "student_attendance_session"("classGroupId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendance_session_timetableSlotId_sessionDate_key" ON "student_attendance_session"("timetableSlotId", "sessionDate");

-- CreateIndex
CREATE INDEX "student_attendance_record_studentId_idx" ON "student_attendance_record"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendance_record_sessionId_studentId_key" ON "student_attendance_record"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "attendance_correction_decision_createdAt_idx" ON "attendance_correction"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "announcement_schoolId_publishAt_idx" ON "announcement"("schoolId", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_event_sourceEventId_key" ON "notification_event"("sourceEventId");

-- CreateIndex
CREATE INDEX "notification_recipientId_readAt_createdAt_idx" ON "notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_eventId_recipientId_channel_key" ON "notification"("eventId", "recipientId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "read_receipt_userId_itemKind_itemId_key" ON "read_receipt"("userId", "itemKind", "itemId");

-- AddForeignKey
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "grade_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_programId_fkey" FOREIGN KEY ("programId") REFERENCES "program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_mainRoomId_fkey" FOREIGN KEY ("mainRoomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_assignment" ADD CONSTRAINT "homeroom_assignment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_assignment" ADD CONSTRAINT "homeroom_assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_version" ADD CONSTRAINT "timetable_version_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_version" ADD CONSTRAINT "timetable_version_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slot" ADD CONSTRAINT "timetable_slot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "timetable_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slot" ADD CONSTRAINT "timetable_slot_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "teaching_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slot" ADD CONSTRAINT "timetable_slot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_session" ADD CONSTRAINT "student_attendance_session_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_session" ADD CONSTRAINT "student_attendance_session_timetableSlotId_fkey" FOREIGN KEY ("timetableSlotId") REFERENCES "timetable_slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_session" ADD CONSTRAINT "student_attendance_session_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "teaching_assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_session" ADD CONSTRAINT "student_attendance_session_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_record" ADD CONSTRAINT "student_attendance_record_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "student_attendance_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_record" ADD CONSTRAINT "student_attendance_record_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_record" ADD CONSTRAINT "student_attendance_record_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction" ADD CONSTRAINT "attendance_correction_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "student_attendance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "notification_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ───── Aturan tambahan (tidak bisa dinyatakan di Prisma) ─────
-- Satu penempatan utama aktif terbuka per siswa.
CREATE UNIQUE INDEX "enrollment_one_open_per_student" ON "enrollment"("studentId") WHERE "validTo" IS NULL AND "status" = 'ACTIVE';
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_date_range" CHECK ("validTo" IS NULL OR "validTo" >= "validFrom");
-- Satu wali kelas berlaku (terbuka) per rombel.
CREATE UNIQUE INDEX "homeroom_assignment_one_open_per_class" ON "homeroom_assignment"("classGroupId") WHERE "validTo" IS NULL;
ALTER TABLE "homeroom_assignment" ADD CONSTRAINT "homeroom_assignment_date_range" CHECK ("validTo" IS NULL OR "validTo" >= "validFrom");
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_capacity_positive" CHECK ("capacity" > 0);
-- Paling banyak satu draf dan satu versi terbit per rombel per semester.
CREATE UNIQUE INDEX "timetable_version_one_draft" ON "timetable_version"("termId", "classGroupId") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "timetable_version_one_published" ON "timetable_version"("termId", "classGroupId") WHERE "status" = 'PUBLISHED';
ALTER TABLE "timetable_slot" ADD CONSTRAINT "timetable_slot_weekday" CHECK ("weekday" BETWEEN 1 AND 7);
ALTER TABLE "timetable_slot" ADD CONSTRAINT "timetable_slot_time_range" CHECK ("startTime" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "endTime" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "startTime" < "endTime");
ALTER TABLE "lesson_period" ADD CONSTRAINT "lesson_period_time_range" CHECK ("startTime" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "endTime" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "startTime" < "endTime");
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_weekly_periods" CHECK ("weeklyPeriods" BETWEEN 0 AND 40);
-- Satu koreksi menunggu per catatan absensi.
CREATE UNIQUE INDEX "attendance_correction_one_pending" ON "attendance_correction"("recordId") WHERE "decision" = 'PENDING';
-- Pengumuman untuk rombel wajib menyebut rombelnya.
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_class_audience" CHECK (("audienceKind" = 'CLASS_GROUP') = ("classGroupId" IS NOT NULL));
