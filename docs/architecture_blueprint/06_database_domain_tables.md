# Rancangan Tabel Domain Lanjutan

Dokumen ini melanjutkan [tabel inti](05_database_core_tables.md). Setiap tabel di bawah adalah kandidat model logis; pemilik proses, kebijakan retensi, dan alur kerja harus dikonfirmasi sebelum ditulis sebagai Prisma schema. Aturan umum: `id UUID`, timestamp UTC, FK eksplisit bila mungkin, transaksi pada perubahan uang/izin/kapasitas, dan audit pada tindakan sensitif.

## A. Keuangan dan pembayaran

| Tabel | Kolom inti | Constraint/aturan |
| --- | --- | --- |
| `fee_item` | `school_id, code, name, category, currency` | Kode unik per sekolah |
| `fee_plan_version` | `academic_year_id, target_rule, frequency, amount, status` | Versi terbit immutable |
| `fee_assessment` | `plan_version_id, student_id, billing_period, amount` | Cegah tagihan ganda per periode |
| `discount_grant` | `student_id, kind, value, valid_from, valid_to, status, approver_id` | Akses terbatas; riwayat keputusan |
| `invoice` | `school_id, invoice_no, student_id, due_at, status, total` | Nomor unik; total snapshot |
| `invoice_line` | `invoice_id, fee_item_id, quantity, unit_price, discount, line_total` | `numeric`, bukan float |
| `invoice_adjustment` | `invoice_id, amount, reason, approved_by` | Koreksi tanpa menimpa tagihan |
| `payment_intent` | `external_ref, amount, currency, status, expires_at` | Satu percobaan ber-ID unik |
| `payment` | `channel, external_ref, amount, confirmed_at, status` | Referensi eksternal unik per provider |
| `payment_event` | `payment_id, provider_event_id, payload_ref, received_at` | Callback idempoten |
| `payment_allocation` | `payment_id, invoice_id, amount` | Total alokasi <= pembayaran terkonfirmasi |
| `refund` | `payment_id, amount, reason, status, approver_id` | Transaksi awal tetap ada |
| `reconciliation_match` | `payment_id, source_ref, match_status, decided_by` | Selisih dan keputusan terlacak |
| `finance_period_close` | `period, closed_at, closed_by, snapshot_ref` | Koreksi setelah tutup via penyesuaian |

## B. Perpustakaan, kegiatan, kantin, dan layanan

| Tabel | Kolom inti | Constraint/aturan |
| --- | --- | --- |
| `catalog_item` | `title, author, isbn, category, status` | Duplikasi ISBN ditinjau |
| `book_copy` | `catalog_item_id, barcode, room_id, condition, status` | Barcode unik |
| `loan_policy_version` | `borrower_kind, quota, duration_days, fine_rule` | Kebijakan historis |
| `loan` | `copy_id, borrower_person_id, borrowed_at, due_at, returned_at` | Satu pinjaman aktif per copy |
| `reservation` | `catalog_item_id, borrower_id, queue_at, expires_at, status` | Antrean dan kedaluwarsa |
| `fine` | `loan_id, amount, status, finance_ref` | Pembayaran di modul keuangan |
| `digital_resource` | `file_object_id, rights, audience_rule, status` | Unduh berizin |
| `activity` | `term_id, title, category, capacity, status` | Perubahan terbit berversi |
| `activity_staff_assignment` | `activity_id, employee_id, role, valid_from, valid_to` | Akses berbatas waktu |
| `activity_registration` | `activity_id, student_id, status, applied_at` | Unik aktif; kapasitas atomik |
| `guardian_consent` | `registration_id, guardian_id, decision, decided_at` | Wali berhak dan syarat versi benar |
| `activity_session` | `activity_id, starts_at, ends_at, room_id, status` | Benturan jadwal diperiksa |
| `activity_attendance` | `session_id, student_id, status` | Terpisah dari absensi kelas |
| `achievement` | `student_id, activity_id, result, proof_file_id, status` | Verifikasi sebelum terbit |
| `canteen_tenant` | `name, room_id, valid_from, valid_to, status` | Scope tenant |
| `menu_item` | `tenant_id, name, category, available, status` | Tenant hanya edit miliknya |
| `menu_price_version` | `menu_item_id, price, valid_from, valid_to` | Harga transaksi snapshot |
| `canteen_order` | `customer_id, tenant_id, status, total` | Opsional; idempotency key |
| `canteen_order_line` | `order_id, menu_item_id, quantity, unit_price_snapshot` | Harga historis |
| `service_type` | `owner_unit_id, code, form_schema_version, target_response` | Katalog layanan |
| `service_request` | `requester_id, student_id, service_type_id, status, assignee_id` | Scope dan pemilik jelas |
| `service_request_event` | `request_id, actor_id, action, occurred_at, note_ref` | Timeline |

## C. Fasilitas, aset, dan transportasi

| Tabel | Kolom inti | Constraint/aturan |
| --- | --- | --- |
| `room_profile` | `room_id, capacity, equipment_json, status` | Ekstensi master ruang |
| `room_availability_rule` | `room_id, hours_json, valid_from, valid_to` | Aturan berversi |
| `room_booking` | `room_id, requester_id, starts_at, ends_at, status` | Benturan dengan jadwal/blok |
| `booking_occurrence` | `series_ref, room_id, starts_at, ends_at, exception` | Booking berulang eksplisit |
| `room_block` | `room_id, starts_at, ends_at, reason, source_ref` | Penutupan perbaikan |
| `asset` | `asset_tag, category, room_id, condition, status` | Tag unik |
| `asset_movement` | `asset_id, from_room_id, to_room_id, moved_at, actor_id` | Riwayat lokasi |
| `maintenance_ticket` | `ticket_no, room_id, asset_id, priority, status` | Boleh tanpa assetId |
| `ticket_event` | `ticket_id, actor_id, action, occurred_at, note_ref` | Timeline |
| `work_order` | `ticket_id, technician_id, scheduled_at, status, result_ref` | Penugasan terbatas |
| `maintenance_plan_version` | `asset_kind, interval_rule, checklist_json` | Preventif berversi |
| `school_vehicle` | `vehicle_no, capacity, status, asset_id` | Tidak beroperasi saat tidak layak |
| `route_version` | `route_code, version_no, status, valid_from` | Terbit immutable |
| `route_stop` | `route_version_id, stop_order, name, planned_time` | Urutan unik per rute |
| `transport_enrollment` | `student_id, route_version_id, pickup_stop_id, dropoff_stop_id, status` | Kapasitas dan hak wali |
| `trip` | `route_version_id, trip_date, vehicle_id, driver_id, status` | Perjalanan per tanggal |
| `trip_manifest` | `trip_id, student_id, planned_pickup, planned_dropoff` | Snapshot peserta |
| `boarding_event` | `trip_id, student_id, stop_id, kind, event_at, actor_id` | Idempoten; koreksi terlacak |

## D. Keamanan, keselamatan, lokasi, UKS/konseling

Tabel pada kelompok ini memerlukan threat model, klasifikasi data, dan kebijakan akses/retensi tersendiri. Jangan menggabungkannya ke profil siswa atau tabel notifikasi umum.

| Tabel | Kolom inti | Constraint/aturan |
| --- | --- | --- |
| `access_point` | `building_id, zone_id, code, direction, status` | Titik akses unik |
| `access_device` | `access_point_id, device_ref, last_sync_at, status` | Secret terpisah |
| `credential` | `owner_person_id, token_hash, kind, valid_from, valid_to, status` | Token bukan NIS/NIP |
| `access_event` | `device_id, external_event_id, event_at, received_at, decision` | Event mentah idempoten |
| `visitor` | `name, organization, contact_ref` | Data minimum; retensi |
| `visit` | `visitor_id, host_id, purpose, check_in_at, check_out_at, status` | Kunjungan aktif terlihat |
| `student_exit_permit` | `student_id, requester_id, pickup_person_ref, valid_at, status` | Persetujuan dan masa berlaku |
| `student_release_event` | `permit_id, guard_id, verified_pickup_ref, released_at` | Verifikasi fisik |
| `security_signal` | `device_ref, kind, signaled_at, acknowledged_at, status` | Alarm tidak otomatis insiden |
| `security_incident` | `location_ref, category, status, owner_id` | Rujukan safeguarding minimum |
| `safety_report` | `reporter_mode, category, narrative_ref, reported_at, status` | Identitas pelapor dipisah |
| `safety_case` | `report_id, urgency, status, owner_id` | Akses per penugasan |
| `case_assignment` | `case_id, user_id, role, valid_from, valid_to` | Membentuk scope |
| `case_event` | `case_id, actor_id, kind, content_ref, occurred_at` | Revisi berjejak |
| `case_task` | `case_id, owner_id, due_at, status` | Eskalasi terlambat |
| `emergency_request` | `requester_id, sent_at, acknowledged_at, status, location_ref` | Terkirim ≠ diakui |
| `campus_zone` | `building_id, parent_zone_id, name, granularity` | Hirarki zona |
| `location_sensor` | `zone_id, device_ref, last_sync_at, status` | Sensor offline terlihat |
| `location_signal` | `student_token_ref, sensor_id, event_at, received_at, quality` | Retensi pendek; idempoten |
| `tracking_policy_version` | `active_hours, access_rule, retention_rule, status` | Kebijakan berversi |
| `location_lookup_audit` | `actor_id, student_id, purpose, looked_up_at` | Akses individual tercatat |
| `health_visit` | `student_id, staff_id, visited_at, outcome_ref` | Akses UKS terbatas |
| `health_referral` | `visit_id, target_ref, status` | Data minimum |
| `counseling_request` | `student_id, requester_id, status, reason_ref` | Alasan privat |
| `counseling_appointment` | `request_id, counselor_id, starts_at, ends_at, status` | Benturan jadwal |
| `counseling_session_note` | `appointment_id, version_no, content_ref` | Akses konselor; riwayat |
| `sensitive_access_audit` | `actor_id, target_ref, reason, accessed_at` | Termasuk break glass |

## E. Catatan, IT, dan command center

| Tabel | Kolom inti | Constraint/aturan |
| --- | --- | --- |
| `note` | `owner_user_id, title, classification, version_no, status` | Catatan pribadi/tim |
| `note_revision` | `note_id, editor_id, content_ref, saved_at` | Konflik tidak hilang diam-diam |
| `note_share` | `note_id, subject_ref, role, valid_from, valid_to` | Pencabutan akses segera |
| `managed_device` | `asset_id, device_id, room_id, status` | Inventaris perangkat |
| `agent_enrollment` | `device_id, credential_ref, version, last_seen_at` | Rotasi/pencabutan |
| `telemetry_sample` | `device_id, event_at, received_at, metrics_json` | Retensi terbatas |
| `device_alert` | `device_id, kind, severity, status` | Deduplikasi |
| `remote_action` | `device_id, command_kind, reason, approved_by, status` | Allowlist dan audit |
| `metric_definition_version` | `code, formula_ref, denominator_ref, valid_from` | Definisi KPI berversi |
| `metric_snapshot` | `metric_id, scope_ref, period, value, calculated_at` | Waktu/kualitas terlihat |
| `data_quality_status` | `source_ref, freshness, missing_count` | Data usang diberi label |
| `operational_alert` | `source_ref, owner_id, priority, status` | Deduplikasi |
| `report_job` | `template_ref, filters_json, requester_id, status, file_ref` | Ekspor besar di worker |

## Urutan pemodelan

1. Bekukan aturan bisnis fondasi: identitas, wali, tahun ajaran, penempatan, peran/scope.
2. Buat migrasi inti, seed sintetis, serta constraint yang dapat diuji.
3. Tambahkan akademik/absensi/komunikasi untuk MVP.
4. Tambahkan domain keuangan dan operasi sesuai SOP.
5. Model keselamatan, kesehatan, lokasi, dan perangkat setelah threat model/pilot.

Jumlah tabel di inventaris ini **bukan target implementasi sekali jalan**. Beberapa entitas dapat digabung atau dipecah sesudah user flow, query, dan kebutuhan audit nyata ditinjau.
