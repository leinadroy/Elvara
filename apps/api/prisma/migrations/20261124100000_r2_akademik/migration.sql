-- CreateEnum
CREATE TYPE "CalendarCategory" AS ENUM ('SEMESTER', 'EXAM', 'HOLIDAY', 'REPORT_DAY', 'DEADLINE', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "CalendarAudience" AS ENUM ('ALL', 'STAFF', 'STUDENTS_GUARDIANS', 'GRADE_LEVEL');

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('ASSIGNMENT', 'QUIZ', 'EXAM', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "GradeState" AS ENUM ('PENDING', 'SCORED', 'MISSING', 'EXCUSED');

-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "academic_calendar_event" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" "CalendarCategory" NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "audience" "CalendarAudience" NOT NULL DEFAULT 'ALL',
    "gradeLevelId" UUID,
    "location" TEXT,
    "description" TEXT,
    "status" "CalendarStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_scheme_version" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "gradeLevelId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "SchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "roundingRule" TEXT NOT NULL DEFAULT 'HALF_UP_INTEGER',
    "passingScore" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_scheme_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_component" (
    "id" UUID NOT NULL,
    "schemeVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "grade_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_outcome" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "gradeLevelId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_activity" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "teachingAssignmentId" UUID NOT NULL,
    "kind" "ActivityKind" NOT NULL DEFAULT 'ASSIGNMENT',
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "allowLate" BOOLEAN NOT NULL DEFAULT false,
    "allowResubmit" BOOLEAN NOT NULL DEFAULT true,
    "acceptsSubmissions" BOOLEAN NOT NULL DEFAULT true,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "latestVersionNo" INTEGER NOT NULL DEFAULT 1,
    "status" "SubmissionStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_version" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "text" TEXT,
    "storageKey" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "late" BOOLEAN NOT NULL,
    "idempotencyKey" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "teachingAssignmentId" UUID NOT NULL,
    "componentId" UUID NOT NULL,
    "activityId" UUID,
    "title" TEXT NOT NULL,
    "assessedOn" DATE,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_entry" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "state" "GradeState" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_change" (
    "id" UUID NOT NULL,
    "gradeEntryId" UUID NOT NULL,
    "oldState" "GradeState" NOT NULL,
    "oldScore" DOUBLE PRECISION,
    "newState" "GradeState" NOT NULL,
    "newScore" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "status" "ReportCardStatus" NOT NULL DEFAULT 'DRAFT',
    "homeroomNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "returnNote" TEXT,
    "currentVersionNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_subject" (
    "id" UUID NOT NULL,
    "reportCardId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "highestAchievement" TEXT,
    "needsImprovement" TEXT,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_version" (
    "id" UUID NOT NULL,
    "reportCardId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "revisionReason" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" UUID NOT NULL,

    CONSTRAINT "report_card_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_calendar_event_schoolId_startsOn_idx" ON "academic_calendar_event"("schoolId", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "grade_scheme_version_termId_subjectId_gradeLevelId_versionN_key" ON "grade_scheme_version"("termId", "subjectId", "gradeLevelId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "grade_component_schemeVersionId_code_key" ON "grade_component"("schemeVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "learning_outcome_subjectId_gradeLevelId_code_key" ON "learning_outcome"("subjectId", "gradeLevelId", "code");

-- CreateIndex
CREATE INDEX "learning_activity_teachingAssignmentId_dueAt_idx" ON "learning_activity"("teachingAssignmentId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "submission_activityId_studentId_key" ON "submission"("activityId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_version_submissionId_versionNo_key" ON "submission_version"("submissionId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "submission_version_submissionId_idempotencyKey_key" ON "submission_version"("submissionId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_activityId_key" ON "assessment"("activityId");

-- CreateIndex
CREATE INDEX "assessment_teachingAssignmentId_idx" ON "assessment"("teachingAssignmentId");

-- CreateIndex
CREATE INDEX "grade_entry_studentId_idx" ON "grade_entry"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_entry_assessmentId_studentId_key" ON "grade_entry"("assessmentId", "studentId");

-- CreateIndex
CREATE INDEX "grade_change_gradeEntryId_idx" ON "grade_change"("gradeEntryId");

-- CreateIndex
CREATE INDEX "report_card_classGroupId_termId_idx" ON "report_card"("classGroupId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "report_card_studentId_termId_key" ON "report_card"("studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "report_card_subject_reportCardId_subjectId_key" ON "report_card_subject"("reportCardId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "report_card_version_reportCardId_versionNo_key" ON "report_card_version"("reportCardId", "versionNo");

-- AddForeignKey
ALTER TABLE "academic_calendar_event" ADD CONSTRAINT "academic_calendar_event_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "grade_level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_scheme_version" ADD CONSTRAINT "grade_scheme_version_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_scheme_version" ADD CONSTRAINT "grade_scheme_version_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_scheme_version" ADD CONSTRAINT "grade_scheme_version_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "grade_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_component" ADD CONSTRAINT "grade_component_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "grade_scheme_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_outcome" ADD CONSTRAINT "learning_outcome_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_outcome" ADD CONSTRAINT "learning_outcome_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "grade_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_activity" ADD CONSTRAINT "learning_activity_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "teaching_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "learning_activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_version" ADD CONSTRAINT "submission_version_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "teaching_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "grade_component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "learning_activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_entry" ADD CONSTRAINT "grade_entry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_entry" ADD CONSTRAINT "grade_entry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_change" ADD CONSTRAINT "grade_change_gradeEntryId_fkey" FOREIGN KEY ("gradeEntryId") REFERENCES "grade_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card" ADD CONSTRAINT "report_card_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card" ADD CONSTRAINT "report_card_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card" ADD CONSTRAINT "report_card_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_subject" ADD CONSTRAINT "report_card_subject_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "report_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_subject" ADD CONSTRAINT "report_card_subject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_version" ADD CONSTRAINT "report_card_version_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "report_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ───── Aturan tambahan R2 (tidak bisa dinyatakan di Prisma) ─────
ALTER TABLE "academic_calendar_event" ADD CONSTRAINT "calendar_date_range" CHECK ("endsOn" >= "startsOn");
ALTER TABLE "academic_calendar_event" ADD CONSTRAINT "calendar_grade_audience" CHECK (("audience" = 'GRADE_LEVEL') = ("gradeLevelId" IS NOT NULL));
-- Paling banyak satu draf dan satu versi terbit per mapel × tingkat × semester.
CREATE UNIQUE INDEX "grade_scheme_one_draft" ON "grade_scheme_version"("termId", "subjectId", "gradeLevelId") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "grade_scheme_one_published" ON "grade_scheme_version"("termId", "subjectId", "gradeLevelId") WHERE "status" = 'PUBLISHED';
ALTER TABLE "grade_scheme_version" ADD CONSTRAINT "grade_scheme_passing_range" CHECK ("passingScore" IS NULL OR ("passingScore" >= 0 AND "passingScore" <= 100));
ALTER TABLE "grade_component" ADD CONSTRAINT "grade_component_weight_range" CHECK ("weight" > 0 AND "weight" <= 100);
ALTER TABLE "learning_activity" ADD CONSTRAINT "learning_activity_time_range" CHECK ("dueAt" > "opensAt");
-- Nilai berangka hanya untuk keadaan SCORED; rentang 0–100.
ALTER TABLE "grade_entry" ADD CONSTRAINT "grade_entry_score_state" CHECK (("state" = 'SCORED') = ("score" IS NOT NULL));
ALTER TABLE "grade_entry" ADD CONSTRAINT "grade_entry_score_range" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100));
