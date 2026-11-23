-- Nama constraint & index mengikuti nama tabel baru.


-- AlterTable
ALTER TABLE "academic_year" RENAME CONSTRAINT "academic_years_pkey" TO "academic_year_pkey";

-- AlterTable
ALTER TABLE "account_invitation" RENAME CONSTRAINT "invitations_pkey" TO "account_invitation_pkey";

-- AlterTable
ALTER TABLE "audit_event" RENAME CONSTRAINT "audit_events_pkey" TO "audit_event_pkey";

-- AlterTable
ALTER TABLE "building" RENAME CONSTRAINT "buildings_pkey" TO "building_pkey";

-- AlterTable
ALTER TABLE "employee" RENAME CONSTRAINT "employees_pkey" TO "employee_pkey";

-- AlterTable
ALTER TABLE "floor" RENAME CONSTRAINT "floors_pkey" TO "floor_pkey";

-- AlterTable
ALTER TABLE "guardian" RENAME CONSTRAINT "guardians_pkey" TO "guardian_pkey";

-- AlterTable
ALTER TABLE "import_batch" RENAME CONSTRAINT "import_batches_pkey" TO "import_batch_pkey";

-- AlterTable
ALTER TABLE "import_row_result" RENAME CONSTRAINT "import_row_results_pkey" TO "import_row_result_pkey";

-- AlterTable
ALTER TABLE "mfa_challenge" RENAME CONSTRAINT "mfa_challenges_pkey" TO "mfa_challenge_pkey";

-- AlterTable
ALTER TABLE "person" RENAME CONSTRAINT "people_pkey" TO "person_pkey";

-- AlterTable
ALTER TABLE "person_document" RENAME CONSTRAINT "person_documents_pkey" TO "person_document_pkey";

-- AlterTable
ALTER TABLE "profile_correction_request" RENAME CONSTRAINT "profile_correction_requests_pkey" TO "profile_correction_request_pkey";

-- AlterTable
ALTER TABLE "room" RENAME CONSTRAINT "rooms_pkey" TO "room_pkey";

-- AlterTable
ALTER TABLE "school" RENAME CONSTRAINT "schools_pkey" TO "school_pkey";

-- AlterTable
ALTER TABLE "session" RENAME CONSTRAINT "sessions_pkey" TO "session_pkey";

-- AlterTable
ALTER TABLE "student" RENAME CONSTRAINT "students_pkey" TO "student_pkey";

-- AlterTable
ALTER TABLE "student_guardian" RENAME CONSTRAINT "student_guardians_pkey" TO "student_guardian_pkey";

-- AlterTable
ALTER TABLE "term" RENAME CONSTRAINT "terms_pkey" TO "term_pkey";

-- AlterTable
ALTER TABLE "user_account" RENAME CONSTRAINT "users_pkey" TO "user_account_pkey";

-- AlterTable
ALTER TABLE "user_role_assignment" RENAME CONSTRAINT "user_roles_pkey" TO "user_role_assignment_pkey";

-- RenameForeignKey
ALTER TABLE "academic_year" RENAME CONSTRAINT "academic_years_schoolId_fkey" TO "academic_year_schoolId_fkey";

-- RenameForeignKey
ALTER TABLE "account_invitation" RENAME CONSTRAINT "invitations_personId_fkey" TO "account_invitation_personId_fkey";

-- RenameForeignKey
ALTER TABLE "account_invitation" RENAME CONSTRAINT "invitations_schoolId_fkey" TO "account_invitation_schoolId_fkey";

-- RenameForeignKey
ALTER TABLE "account_invitation" RENAME CONSTRAINT "invitations_studentGuardianId_fkey" TO "account_invitation_studentGuardianId_fkey";

-- RenameForeignKey
ALTER TABLE "building" RENAME CONSTRAINT "buildings_schoolId_fkey" TO "building_schoolId_fkey";

-- RenameForeignKey
ALTER TABLE "employee" RENAME CONSTRAINT "employees_personId_fkey" TO "employee_personId_fkey";

-- RenameForeignKey
ALTER TABLE "floor" RENAME CONSTRAINT "floors_buildingId_fkey" TO "floor_buildingId_fkey";

-- RenameForeignKey
ALTER TABLE "guardian" RENAME CONSTRAINT "guardians_personId_fkey" TO "guardian_personId_fkey";

-- RenameForeignKey
ALTER TABLE "import_batch" RENAME CONSTRAINT "import_batches_schoolId_fkey" TO "import_batch_schoolId_fkey";

-- RenameForeignKey
ALTER TABLE "import_row_result" RENAME CONSTRAINT "import_row_results_batchId_fkey" TO "import_row_result_batchId_fkey";

-- RenameForeignKey
ALTER TABLE "mfa_challenge" RENAME CONSTRAINT "mfa_challenges_userId_fkey" TO "mfa_challenge_userId_fkey";

-- RenameForeignKey
ALTER TABLE "person" RENAME CONSTRAINT "people_schoolId_fkey" TO "person_schoolId_fkey";

-- RenameForeignKey
ALTER TABLE "person_document" RENAME CONSTRAINT "person_documents_personId_fkey" TO "person_document_personId_fkey";

-- RenameForeignKey
ALTER TABLE "profile_correction_request" RENAME CONSTRAINT "profile_correction_requests_personId_fkey" TO "profile_correction_request_personId_fkey";

-- RenameForeignKey
ALTER TABLE "room" RENAME CONSTRAINT "rooms_floorId_fkey" TO "room_floorId_fkey";

-- RenameForeignKey
ALTER TABLE "session" RENAME CONSTRAINT "sessions_userId_fkey" TO "session_userId_fkey";

-- RenameForeignKey
ALTER TABLE "student" RENAME CONSTRAINT "students_personId_fkey" TO "student_personId_fkey";

-- RenameForeignKey
ALTER TABLE "student_guardian" RENAME CONSTRAINT "student_guardians_guardianId_fkey" TO "student_guardian_guardianId_fkey";

-- RenameForeignKey
ALTER TABLE "student_guardian" RENAME CONSTRAINT "student_guardians_studentId_fkey" TO "student_guardian_studentId_fkey";

-- RenameForeignKey
ALTER TABLE "term" RENAME CONSTRAINT "terms_academicYearId_fkey" TO "term_academicYearId_fkey";

-- RenameForeignKey
ALTER TABLE "user_account" RENAME CONSTRAINT "users_personId_fkey" TO "user_account_personId_fkey";

-- RenameForeignKey
ALTER TABLE "user_role_assignment" RENAME CONSTRAINT "user_roles_schoolId_fkey" TO "user_role_assignment_schoolId_fkey";

-- RenameForeignKey
ALTER TABLE "user_role_assignment" RENAME CONSTRAINT "user_roles_userId_fkey" TO "user_role_assignment_userId_fkey";

-- RenameIndex
ALTER INDEX "academic_years_schoolId_name_key" RENAME TO "academic_year_schoolId_name_key";

-- RenameIndex
ALTER INDEX "invitations_personId_idx" RENAME TO "account_invitation_personId_idx";

-- RenameIndex
ALTER INDEX "invitations_tokenHash_key" RENAME TO "account_invitation_tokenHash_key";

-- RenameIndex
ALTER INDEX "audit_events_actorUserId_createdAt_idx" RENAME TO "audit_event_actorUserId_createdAt_idx";

-- RenameIndex
ALTER INDEX "audit_events_entityType_entityId_idx" RENAME TO "audit_event_entityType_entityId_idx";

-- RenameIndex
ALTER INDEX "audit_events_schoolId_createdAt_idx" RENAME TO "audit_event_schoolId_createdAt_idx";

-- RenameIndex
ALTER INDEX "buildings_schoolId_code_key" RENAME TO "building_schoolId_code_key";

-- RenameIndex
ALTER INDEX "employees_personId_key" RENAME TO "employee_personId_key";

-- RenameIndex
ALTER INDEX "employees_schoolId_employeeNumber_key" RENAME TO "employee_schoolId_employeeNumber_key";

-- RenameIndex
ALTER INDEX "employees_schoolId_nip_key" RENAME TO "employee_schoolId_nip_key";

-- RenameIndex
ALTER INDEX "employees_schoolId_status_idx" RENAME TO "employee_schoolId_status_idx";

-- RenameIndex
ALTER INDEX "floors_buildingId_level_key" RENAME TO "floor_buildingId_level_key";

-- RenameIndex
ALTER INDEX "guardians_personId_key" RENAME TO "guardian_personId_key";

-- RenameIndex
ALTER INDEX "import_batches_schoolId_createdAt_idx" RENAME TO "import_batch_schoolId_createdAt_idx";

-- RenameIndex
ALTER INDEX "import_row_results_batchId_rowNumber_idx" RENAME TO "import_row_result_batchId_rowNumber_idx";

-- RenameIndex
ALTER INDEX "mfa_challenges_tokenHash_key" RENAME TO "mfa_challenge_tokenHash_key";

-- RenameIndex
ALTER INDEX "people_schoolId_fullName_idx" RENAME TO "person_schoolId_fullName_idx";

-- RenameIndex
ALTER INDEX "person_documents_personId_deletedAt_idx" RENAME TO "person_document_personId_deletedAt_idx";

-- RenameIndex
ALTER INDEX "person_documents_storageKey_key" RENAME TO "person_document_storageKey_key";

-- RenameIndex
ALTER INDEX "profile_correction_requests_personId_status_idx" RENAME TO "profile_correction_request_personId_status_idx";

-- RenameIndex
ALTER INDEX "profile_correction_requests_schoolId_status_createdAt_idx" RENAME TO "profile_correction_request_schoolId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "rooms_buildingId_code_key" RENAME TO "room_buildingId_code_key";

-- RenameIndex
ALTER INDEX "schools_npsn_key" RENAME TO "school_npsn_key";

-- RenameIndex
ALTER INDEX "sessions_tokenHash_key" RENAME TO "session_tokenHash_key";

-- RenameIndex
ALTER INDEX "sessions_userId_idx" RENAME TO "session_userId_idx";

-- RenameIndex
ALTER INDEX "students_personId_key" RENAME TO "student_personId_key";

-- RenameIndex
ALTER INDEX "students_schoolId_nis_key" RENAME TO "student_schoolId_nis_key";

-- RenameIndex
ALTER INDEX "students_schoolId_nisn_key" RENAME TO "student_schoolId_nisn_key";

-- RenameIndex
ALTER INDEX "students_schoolId_status_idx" RENAME TO "student_schoolId_status_idx";

-- RenameIndex
ALTER INDEX "student_guardians_guardianId_status_idx" RENAME TO "student_guardian_guardianId_status_idx";

-- RenameIndex
ALTER INDEX "student_guardians_studentId_guardianId_key" RENAME TO "student_guardian_studentId_guardianId_key";

-- RenameIndex
ALTER INDEX "terms_academicYearId_sequence_key" RENAME TO "term_academicYearId_sequence_key";

-- RenameIndex
ALTER INDEX "users_email_key" RENAME TO "user_account_email_key";

-- RenameIndex
ALTER INDEX "users_personId_key" RENAME TO "user_account_personId_key";

-- RenameIndex
ALTER INDEX "user_roles_userId_role_schoolId_key" RENAME TO "user_role_assignment_userId_role_schoolId_key";

