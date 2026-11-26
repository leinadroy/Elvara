# Rancangan Tabel Inti Database

**Status:** model logis awal untuk Prisma + PostgreSQL. Nama tabel memakai `snake_case`; model Prisma dapat memakai PascalCase dengan `@@map`. Semua tabel transaksi mempunyai `id UUID`, `created_at`, `updated_at` bila cocok. Tanggal kejadian disimpan `timestamptz` UTC dan ditampilkan di zona waktu sekolah. Nominal uang memakai `numeric`/Prisma `Decimal`.

## Aturan lintas tabel

- `school_id` disimpan pada data yang cakupannya sekolah meskipun rilis awal satu sekolah. Jangan memperkenalkan logika multi-sekolah penuh sebelum dibutuhkan.
- `created_by_user_id`/`updated_by_user_id` ada pada perubahan administratif penting. Audit event menyimpan perubahan yang perlu dibuktikan.
- Record historis seperti penempatan, jabatan, jadwal terbit, nilai terbit, dan rapor memakai `effective_from/effective_to` atau versi; jangan menimpa masa lalu.
- FK memakai `RESTRICT` untuk entitas historis penting. Penghapusan profil bukan cara membatalkan transaksi; gunakan status/arsip dan kebijakan retensi.
- Pencarian nama/NIS/NIP dan filter dashboard diberi indeks setelah pola query diketahui. Constraint unik adalah aturan bisnis, bukan pengganti validasi API.
- Data sensitif dipisahkan dari tabel profil umum agar query daftar tidak mengambilnya tanpa sengaja.

## A. Sekolah, orang, dan akun

| Tabel | Kolom inti (selain ID/timestamp) | Relasi dan constraint utama |
| --- | --- | --- |
| `school` | `code, legal_name, short_name, timezone, status` | `code` unik |
| `building` | `school_id, code, name, status` | Unik `(school_id, code)` |
| `floor` | `building_id, code, name, level_no` | Unik `(building_id, code)` |
| `room` | `building_id, floor_id, code, name, kind, capacity, status` | Unik `(building_id, code)`; kapasitas >= 0 |
| `org_unit` | `school_id, parent_unit_id, code, name, status` | Unik `(school_id, code)`; cegah siklus pada service |
| `person` | `legal_name, preferred_name, birth_date, status` | Master identitas, bukan akun |
| `person_contact` | `person_id, type, value_encrypted, verified_at, is_primary` | Kontak terverifikasi; jangan log nilai mentah |
| `student` | `school_id, person_id, nis, admission_date, status` | Unik `(school_id, nis)` sesuai aturan |
| `employee` | `school_id, person_id, employee_no, employee_kind, start_date, status` | Nomor pegawai unik bila terisi |
| `guardian` | `person_id, status` | Satu person dapat menjadi wali beberapa siswa |
| `student_guardian` | `student_id, guardian_id, relationship, verified_at, valid_from, valid_to, status` | Hubungan aktif tidak duplikat |
| `guardian_permission` | `student_guardian_id, permission_code, valid_from, valid_to` | Hak akademik, pembayaran, lokasi, penjemputan terpisah |
| `position` | `org_unit_id, code, name` | Kode unik per unit |
| `position_assignment` | `position_id, employee_id, valid_from, valid_to` | Riwayat jabatan |
| `user_account` | `person_id, login_identifier, status, activated_at` | Login unik; boleh belum ada untuk person |
| `role` | `code, name, status` | Kode unik |
| `permission` | `code, description` | Kode unik |
| `role_permission` | `role_id, permission_id` | Unik pasangan |
| `user_role_assignment` | `user_id, role_id, school_id, scope_type, scope_id, valid_from, valid_to` | Scope divalidasi backend; indeks pengguna/role/periode |
| `session` | `user_id, token_hash, expires_at, revoked_at` | Token mentah tidak disimpan |
| `account_invitation` | `user_id, channel, token_hash, expires_at, accepted_at` | Sekali pakai |

Untuk `scope_type/scope_id`, tahap implementasi perlu memilih antara referensi polimorfik terkontrol atau tabel scope khusus agar integritas FK tetap kuat. Jangan menganggap satu role memberi akses ke seluruh sekolah secara otomatis.

## B. Tahun ajaran dan struktur kelas

| Tabel | Kolom inti | Relasi dan constraint |
| --- | --- | --- |
| `academic_year` | `school_id, code, start_date, end_date, status` | Satu aktif per sekolah; rentang tervalidasi |
| `term` | `academic_year_id, code, start_date, end_date, status` | Unik per tahun; dalam rentang tahun |
| `grade_level` | `school_id, code, ordinal, name` | Urutan tingkat |
| `program` | `school_id, code, name, status` | Opsional menurut jenjang |
| `class_group` | `academic_year_id, grade_level_id, program_id, code, capacity, main_room_id, status` | Unik `(academic_year_id, code)` |
| `enrollment` | `student_id, class_group_id, valid_from, valid_to, status, reason` | Satu rombel utama aktif per siswa/tanggal |
| `homeroom_assignment` | `class_group_id, employee_id, valid_from, valid_to` | Riwayat wali kelas |

Pencegahan overlap penempatan membutuhkan constraint rentang PostgreSQL atau transaksi/lock yang diuji; validasi hanya di frontend tidak cukup.

## C. Akademik

| Tabel | Kolom inti | Relasi dan constraint |
| --- | --- | --- |
| `curriculum` | `school_id, name, level, status` | Master kurikulum |
| `curriculum_version` | `curriculum_id, version_no, effective_from, published_at` | Unik versi; terbit immutable |
| `subject` | `school_id, code, name, group_code, status` | Kode unik per sekolah |
| `curriculum_subject` | `curriculum_version_id, subject_id, grade_level_id, program_id, weekly_minutes, is_required` | Unik kombinasi versi/mapel/tingkat/program |
| `learning_outcome` | `curriculum_version_id, subject_id, code, description` | Opsional per kurikulum |
| `teaching_assignment` | `term_id, class_group_id, subject_id, employee_id, teaching_role, valid_from, valid_to` | Guru hanya mengajar dalam penugasan |
| `timetable_version` | `term_id, class_group_id, version_no, status, published_at` | Satu versi terbit berlaku |
| `timetable_slot` | `version_id, teaching_assignment_id, room_id, weekday, start_time, end_time` | Benturan guru/kelas/ruang diuji saat terbit |
| `schedule_exception` | `slot_id, event_date, replacement_ref, reason, status` | Perubahan satu kejadian |
| `learning_activity` | `teaching_assignment_id, kind, title, opens_at, due_at, status` | Draf/terbit/batal |
| `submission` | `activity_id, student_id, submitted_at, status` | Hanya peserta sah |
| `submission_version` | `submission_id, version_no, content_ref, file_ref` | Riwayat unggah |
| `grade_scheme_version` | `teaching_assignment_id, version_no, status, rounding_rule` | Terbit immutable |
| `grade_component` | `scheme_version_id, code, weight, max_score` | Bobot divalidasi |
| `assessment` | `teaching_assignment_id, component_id, title, assessed_at, status` | Sumber nilai |
| `grade_entry` | `assessment_id, student_id, score, grade_state, version_no, published_at` | Unik pasangan; kosong berbeda dari nol |
| `grade_change` | `grade_entry_id, old_value, new_value, reason, actor_id` | Audit koreksi |
| `report_card` | `student_id, term_id, status` | Unik siswa/semester |
| `report_card_version` | `report_card_id, version_no, snapshot_json, published_at, file_ref` | Versi terbit immutable |
| `academic_calendar_event` | `term_id, title, kind, starts_at, ends_at, audience, status` | Hanya terbit tampil |

`snapshot_json` pada rapor adalah salinan historis yang disengaja; sumber nilai tetap berada pada `grade_entry`. Skema penilaian dan aturan perhitungan harus berversi agar hasil dapat direproduksi.

## D. Absensi dan pekerjaan pegawai

| Tabel | Kolom inti | Relasi dan constraint |
| --- | --- | --- |
| `student_attendance_session` | `class_group_id, timetable_slot_id, session_date, starts_at, status` | Sesi dibatalkan tidak dihitung |
| `session_participant` | `session_id, student_id, enrollment_id` | Unik sesi/siswa |
| `student_attendance_record` | `session_id, student_id, status, version_no, finalized_at` | Unik sesi/siswa; pending ≠ alpa |
| `attendance_correction` | `target_kind, target_id, old_status, proposed_status, reason, decision` | Nilai lama dan baru terlacak |
| `absence_request` | `subject_kind, subject_id, requester_id, date_from, date_to, kind, status` | Izin/sakit diputuskan petugas |
| `staff_assignment` | `employee_id, kind, org_unit_id, valid_from, valid_to, status` | Tugas tambahan |
| `work_schedule` | `employee_id, pattern_json, valid_from, valid_to` | Jadwal berversi |
| `work_shift` | `employee_id, starts_at, ends_at, location_id, status` | Benturan tugas diperiksa |
| `staff_attendance_event` | `employee_id, device_id, external_event_id, event_at, received_at` | Event mentah idempoten |
| `attendance_device` | `school_id, device_ref, location_id, last_sync_at, status` | Sumber event diautentikasi |
| `attendance_rule_version` | `school_id, subject_kind, grace_minutes, valid_from` | Perhitungan dapat direproduksi |
| `staff_attendance_record` | `employee_id, work_date, status, finalized_at` | Satu hasil harian final |
| `leave_policy_version` | `school_id, kind, quota_rule, valid_from` | Aturan historis |
| `leave_request` | `employee_id, kind, starts_at, ends_at, status, reviewer_id` | Keputusan dan saldo terlacak |
| `workload_rule_version` | `term_id, assignment_kind, weight` | Definisi beban |
| `workload_snapshot` | `employee_id, term_id, total, source_json` | Hasil historis |
| `performance_cycle` | `school_id, period, rubric_version, status` | Rubrik terkunci setelah dipakai |
| `performance_review` | `employee_id, cycle_id, evaluator_id, status, version_no` | Akses terbatas |

## E. Komunikasi, file, audit, dan pekerjaan latar

| Tabel | Kolom inti | Relasi dan constraint |
| --- | --- | --- |
| `announcement` | `school_id, title, body_ref, audience_rule, status, published_at` | Audiens diperiksa saat baca |
| `message_thread` | `context_kind, context_id, status` | Akses peserta/penugasan |
| `thread_participant` | `thread_id, user_id, role` | Unik pasangan |
| `message` | `thread_id, sender_id, content_ref, sent_at` | Isi privat |
| `notification_event` | `source_event_id, event_type, payload_ref` | Unik source event |
| `notification` | `event_id, recipient_id, channel, status` | Hak penerima diperiksa |
| `delivery_attempt` | `notification_id, provider_ref, result, attempted_at` | Retry terlacak |
| `read_receipt` | `user_id, item_kind, item_id, read_at` | Baca ≠ persetujuan |
| `file_object` | `storage_key, mime_type, size_bytes, checksum, classification` | File privat; key tidak ditebak |
| `document` | `owner_kind, owner_id, category, status, retention_until` | Metadata dan izin |
| `document_version` | `document_id, version_no, file_object_id, published_at` | Terbit immutable |
| `audit_event` | `actor_id, action, target_kind, target_id, occurred_at, request_id, changes_json` | Append-only dari aplikasi |
| `outbox_event` | `event_type, aggregate_ref, payload_json, created_at, processed_at` | Diproses idempoten |
| `job_run` | `job_type, idempotency_key, status, attempts, result_ref` | Retry/hasil dapat dipantau |
| `import_batch` | `type, source_file_id, status, started_at, completed_at` | Hasil per baris terpisah |

**Catatan:** `owner_kind/owner_id` dan `target_kind/target_id` adalah referensi polimorfik pada rancangan awal. Sebelum migrasi final, pilih FK khusus atau tabel penghubung per domain untuk objek yang membutuhkan integritas kuat. `audit_event` tidak menggantikan tabel transaksi/domain yang menyimpan aturan bisnis.
