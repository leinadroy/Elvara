"use client";

import { useState } from "react";
import {
  PublishTimetableSchema,
  SCHEDULE_EXCEPTION_LABELS,
  ScheduleExceptionSchema,
  TimetableSlotSchema,
  WEEKDAY_LABELS,
  type LessonPeriodView,
  type TimetableSlotView,
} from "@smart-school/contracts";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";

type Opt = { value: string; label: string };
const WEEKDAYS: Opt[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: WEEKDAY_LABELS[d]! }));

/**
 * Tambah slot ke draf. Jam bisa dipilih dari bel sekolah (jam ke- awal s.d. akhir) atau diisi manual;
 * isian manual menang bila diisi.
 */
export function SlotForm({ versionId, assignments, rooms, periods, defaultRoomId }: { versionId: string; assignments: Opt[]; rooms: Opt[]; periods: LessonPeriodView[]; defaultRoomId?: string | null }) {
  const periodOpts = periods.map((p) => ({ value: String(p.sequence), label: `Jam ke-${p.sequence} (${p.startTime}–${p.endTime})` }));
  return (
    <InlineForm
      path={`/timetable/versions/${versionId}/slots`}
      schema={TimetableSlotSchema}
      submitLabel="Tambah ke draf"
      resetOnSuccess={false}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      transform={(v) => {
        const from = periods.find((p) => String(p.sequence) === v.periodFrom);
        const to = periods.find((p) => String(p.sequence) === (v.periodTo ?? v.periodFrom));
        return {
          teachingAssignmentId: v.teachingAssignmentId,
          weekday: v.weekday,
          roomId: v.roomId,
          startTime: v.startTime ?? from?.startTime,
          endTime: v.endTime ?? to?.endTime,
        };
      }}
      fields={(e) => (
        <>
          <SelectField name="teachingAssignmentId" label="Mapel & guru" required placeholder="Pilih…" options={assignments} errors={e} />
          <SelectField name="weekday" label="Hari" required defaultValue="1" options={WEEKDAYS} errors={e} />
          <SelectField name="roomId" label="Ruang" defaultValue={defaultRoomId} placeholder="Tanpa ruang" options={rooms} errors={e} />
          <div />
          {periods.length > 0 && (
            <>
              <SelectField name="periodFrom" label="Dari jam ke-" placeholder="—" options={periodOpts} errors={e} />
              <SelectField name="periodTo" label="Sampai jam ke-" placeholder="Sama" options={periodOpts} errors={e} />
            </>
          )}
          <TextField name="startTime" label={periods.length ? "Atau mulai (manual)" : "Mulai"} type="time" errors={e} />
          <TextField name="endTime" label={periods.length ? "Selesai (manual)" : "Selesai"} type="time" errors={e} />
        </>
      )}
    />
  );
}

export function PublishForm({ versionId, defaultDate, disabled }: { versionId: string; defaultDate: string; disabled: boolean }) {
  if (disabled) return <p className="text-sm text-primary">Selesaikan semua benturan sebelum menerbitkan.</p>;
  return (
    <InlineForm
      path={`/timetable/versions/${versionId}/publish`}
      schema={PublishTimetableSchema}
      submitLabel="Terbitkan jadwal"
      className="grid gap-3 sm:max-w-xs"
      fields={(e) => <TextField name="effectiveFrom" label="Berlaku mulai" type="date" required defaultValue={defaultDate} errors={e} description="Versi terbit sebelumnya menjadi riwayat (tidak dihapus)." />}
    />
  );
}

/** Batalkan atau ganti guru/ruang satu pertemuan pada satu tanggal (FR-5.5). */
export function ExceptionForm({ slots, teachers, rooms, today }: { slots: TimetableSlotView[]; teachers: Opt[]; rooms: Opt[]; today: string }) {
  const [kind, setKind] = useState("CANCELLED");
  const [slotId, setSlotId] = useState("");
  return (
    <div
      onChange={(e) => {
        const el = e.target as unknown as HTMLSelectElement;
        if (el.name === "kind") setKind(el.value);
        if (el.name === "slotId") setSlotId(el.value);
      }}
    >
      <InlineForm
        path={`/timetable/slots/${slotId || "_"}/exceptions`}
        schema={ScheduleExceptionSchema}
        submitLabel="Simpan perubahan pertemuan"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        transform={(v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== "slotId"))}
        fields={(e) => (
          <>
            <SelectField
              name="slotId"
              label="Pertemuan"
              required
              placeholder="Pilih…"
              options={slots.map((s) => ({ value: s.id, label: `${WEEKDAY_LABELS[s.weekday]} ${s.startTime} · ${s.subject.name} · ${s.employee.fullName}` }))}
              errors={e}
            />
            <TextField name="date" label="Tanggal" type="date" required defaultValue={today} errors={e} description="Harus jatuh pada hari pertemuan." />
            <SelectField name="kind" label="Jenis" required defaultValue="CANCELLED" options={Object.entries(SCHEDULE_EXCEPTION_LABELS).map(([value, label]) => ({ value, label }))} errors={e} />
            {kind === "SUBSTITUTED" && (
              <>
                <SelectField name="substituteEmployeeId" label="Guru pengganti" placeholder="Tetap guru yang sama" options={teachers} errors={e} />
                <SelectField name="roomId" label="Ruang pengganti" placeholder="Tetap ruang yang sama" options={rooms} errors={e} />
              </>
            )}
            <TextField name="reason" label="Alasan" required errors={e} />
          </>
        )}
      />
    </div>
  );
}
