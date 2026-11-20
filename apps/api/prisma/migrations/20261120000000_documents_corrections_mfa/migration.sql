-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('IDENTITY', 'FAMILY_CARD', 'BIRTH_CERTIFICATE', 'DIPLOMA', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropForeignKey

-- DropIndex

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN     "mfaPendingSecret" TEXT,
ADD COLUMN     "mfaSecret" TEXT;

-- CreateTable
CREATE TABLE "mfa_challenges" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_documents" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,

    CONSTRAINT "person_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_correction_requests" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_challenges_tokenHash_key" ON "mfa_challenges"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "person_documents_storageKey_key" ON "person_documents"("storageKey");

-- CreateIndex
CREATE INDEX "person_documents_personId_deletedAt_idx" ON "person_documents"("personId", "deletedAt");

-- CreateIndex
CREATE INDEX "profile_correction_requests_schoolId_status_createdAt_idx" ON "profile_correction_requests"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "profile_correction_requests_personId_status_idx" ON "profile_correction_requests"("personId", "status");

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_documents" ADD CONSTRAINT "person_documents_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_correction_requests" ADD CONSTRAINT "profile_correction_requests_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Satu pengajuan koreksi yang masih menunggu per orang.
CREATE UNIQUE INDEX "profile_correction_requests_one_pending" ON "profile_correction_requests"("personId") WHERE "status" = 'PENDING';
