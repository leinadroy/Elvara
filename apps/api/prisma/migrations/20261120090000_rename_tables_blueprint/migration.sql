-- Nama tabel tunggal snake_case sesuai architecture_blueprint/05_database_core_tables.md.
-- RENAME mempertahankan data, index, constraint, dan trigger.
ALTER TABLE "users" RENAME TO "user_account";
ALTER TABLE "user_roles" RENAME TO "user_role_assignment";
ALTER TABLE "sessions" RENAME TO "session";
ALTER TABLE "mfa_challenges" RENAME TO "mfa_challenge";
ALTER TABLE "invitations" RENAME TO "account_invitation";
ALTER TABLE "audit_events" RENAME TO "audit_event";
ALTER TABLE "schools" RENAME TO "school";
ALTER TABLE "buildings" RENAME TO "building";
ALTER TABLE "floors" RENAME TO "floor";
ALTER TABLE "rooms" RENAME TO "room";
ALTER TABLE "academic_years" RENAME TO "academic_year";
ALTER TABLE "terms" RENAME TO "term";
ALTER TABLE "people" RENAME TO "person";
ALTER TABLE "students" RENAME TO "student";
ALTER TABLE "employees" RENAME TO "employee";
ALTER TABLE "guardians" RENAME TO "guardian";
ALTER TABLE "student_guardians" RENAME TO "student_guardian";
ALTER TABLE "import_batches" RENAME TO "import_batch";
ALTER TABLE "import_row_results" RENAME TO "import_row_result";
ALTER TABLE "person_documents" RENAME TO "person_document";
ALTER TABLE "profile_correction_requests" RENAME TO "profile_correction_request";
