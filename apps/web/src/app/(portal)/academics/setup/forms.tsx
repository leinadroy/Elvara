"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  GradeLevelSchema,
  LessonPeriodsSchema,
  ProgramSchema,
  SubjectSchema,
  TeachingAssignmentSchema,
  type GradeLevelView,
  type LessonPeriodView,
  type ProgramView,
  type SubjectView,
} from "@smart-school/contracts";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";
import { TEACHING_ROLE_OPTIONS as ROLE_OPTIONS } from "@/lib/labels";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Nonaktif" },
];

/** Baris yang bisa diubah: tombol "Ubah" membuka form kecil di tempat. */
function EditToggle({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Ubah
      </Button>
    );
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      {children(() => setOpen(false))}
      <Button type="button" variant="ghost" size="xs" className="self-start" onClick={() => setOpen(false)}>
        Tutup
      </Button>
    </div>
  );
}

export function GradeLevelForm({ row }: { row?: GradeLevelView }) {
  const form = (close?: () => void) => (
    <InlineForm
      method={row ? "PUT" : "POST"}
      path={row ? `/grade-levels/${row.id}` : "/grade-levels"}
      schema={GradeLevelSchema}
      submitLabel={row ? "Simpan" : "Tambah tingkat"}
      resetOnSuccess={!row}
      onSuccess={close}
      className="grid gap-3 sm:grid-cols-3"
      fields={(e) => (
        <>
          <TextField name="code" label="Kode" required defaultValue={row?.code} errors={e} description="mis. 7, X" />
          <TextField name="ordinal" label="Urutan" type="number" inputMode="numeric" required defaultValue={row?.ordinal} errors={e} />
          <TextField name="name" label="Nama" required defaultValue={row?.name} errors={e} description="mis. Kelas 7" />
        </>
      )}
    />
  );
  return row ? <EditToggle>{(close) => form(close)}</EditToggle> : form();
}

export function ProgramForm({ row }: { row?: ProgramView }) {
  const form = (close?: () => void) => (
    <InlineForm
      method={row ? "PUT" : "POST"}
      path={row ? `/programs/${row.id}` : "/programs"}
      schema={ProgramSchema}
      submitLabel={row ? "Simpan" : "Tambah program"}
      resetOnSuccess={!row}
      onSuccess={close}
      className="grid gap-3 sm:grid-cols-3"
      fields={(e) => (
        <>
          <TextField name="code" label="Kode" required defaultValue={row?.code} errors={e} description="mis. IPA, TKJ" />
          <TextField name="name" label="Nama" required defaultValue={row?.name} errors={e} />
          <SelectField name="status" label="Status" defaultValue={row?.status ?? "ACTIVE"} options={STATUS_OPTIONS} errors={e} />
        </>
      )}
    />
  );
  return row ? <EditToggle>{(close) => form(close)}</EditToggle> : form();
}

export function SubjectForm({ row }: { row?: SubjectView }) {
  const form = (close?: () => void) => (
    <InlineForm
      method={row ? "PUT" : "POST"}
      path={row ? `/subjects/${row.id}` : "/subjects"}
      schema={SubjectSchema}
      submitLabel={row ? "Simpan" : "Tambah mapel"}
      resetOnSuccess={!row}
      onSuccess={close}
      fields={(e) => (
        <>
          <TextField name="code" label="Kode" required defaultValue={row?.code} errors={e} />
          <TextField name="name" label="Nama" required defaultValue={row?.name} errors={e} />
          <TextField name="groupCode" label="Kelompok" defaultValue={row?.groupCode} errors={e} description="Opsional, mis. Umum" />
          <SelectField name="status" label="Status" defaultValue={row?.status ?? "ACTIVE"} options={STATUS_OPTIONS} errors={e} />
        </>
      )}
    />
  );
  return row ? <EditToggle>{(close) => form(close)}</EditToggle> : form();
}

/** Daftar jam pelajaran (bel). Slot jadwal menyimpan jamnya sendiri, jadi mengubah bel tidak menggeser jadwal lama. */
export function PeriodsEditor({ initial, readOnly }: { initial: LessonPeriodView[]; readOnly: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial.length ? initial : [{ sequence: 1, startTime: "07:00", endTime: "07:40" }]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<LessonPeriodView>) => {
    setSaved(false);
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };
  return (
    <div className="flex flex-col gap-3">
      <table className="w-full max-w-lg text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 font-medium">Jam ke-</th>
            <th className="py-1 font-medium">Mulai</th>
            <th className="py-1 font-medium">Selesai</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i}>
              <td className="py-1 pr-2 tabular-nums">{p.sequence}</td>
              <td className="py-1 pr-2">
                <input type="time" aria-label={`Mulai jam ke-${p.sequence}`} disabled={readOnly} value={p.startTime} onChange={(e) => update(i, { startTime: e.target.value })} className="h-8 rounded-md border bg-background px-2" />
              </td>
              <td className="py-1 pr-2">
                <input type="time" aria-label={`Selesai jam ke-${p.sequence}`} disabled={readOnly} value={p.endTime} onChange={(e) => update(i, { endTime: e.target.value })} className="h-8 rounded-md border bg-background px-2" />
              </td>
              <td>
                {!readOnly && rows.length > 1 && i === rows.length - 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus jam ke-${p.sequence}`} onClick={() => setRows((r) => r.slice(0, -1))}>
                    <Trash2 />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const last = rows[rows.length - 1]!;
              setRows([...rows, { sequence: last.sequence + 1, startTime: last.endTime, endTime: last.endTime }]);
            }}
          >
            <Plus /> Tambah jam
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              const parsed = LessonPeriodsSchema.safeParse({ periods: rows });
              if (!parsed.success) return setError(parsed.error.issues.map((x) => x.message).join(" "));
              start(async () => {
                const res = await apiSend("PUT", "/lesson-periods", parsed.data);
                if (!res.ok) return setError(res.error.message);
                setSaved(true);
                router.refresh();
              });
            }}
          >
            {pending ? "Menyimpan…" : "Simpan jam pelajaran"}
          </Button>
          {saved && <span className="text-xs text-muted-foreground">Tersimpan.</span>}
        </div>
      )}
    </div>
  );
}

type Opt = { value: string; label: string };

export function AssignmentForm({ termId, classes, subjects, teachers, fixedClassId }: { termId: string; classes: Opt[]; subjects: Opt[]; teachers: Opt[]; fixedClassId?: string }) {
  return (
    <InlineForm
      path="/teaching-assignments"
      schema={TeachingAssignmentSchema}
      submitLabel="Tambah penugasan"
      transform={(v) => ({ ...v, termId, classGroupId: fixedClassId ?? v.classGroupId })}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      fields={(e) => (
        <>
          {!fixedClassId && <SelectField name="classGroupId" label="Rombel" required placeholder="Pilih…" options={classes} errors={e} />}
          <SelectField name="subjectId" label="Mata pelajaran" required placeholder="Pilih…" options={subjects} errors={e} />
          <SelectField name="employeeId" label="Guru" required placeholder="Pilih…" options={teachers} errors={e} />
          <SelectField name="teachingRole" label="Peran" defaultValue="MAIN" options={ROLE_OPTIONS} errors={e} />
          <TextField name="weeklyPeriods" label="Jam per minggu" type="number" inputMode="numeric" defaultValue={2} required errors={e} />
        </>
      )}
    />
  );
}

/** Ganti guru atau target jam. Riwayat absensi tetap merujuk guru yang mengisinya. */
export function AssignmentEdit({ id, employeeId, weeklyPeriods, teachers }: { id: string; employeeId: string; weeklyPeriods: number; teachers: Opt[] }) {
  return (
    <EditToggle>
      {(close) => (
        <InlineForm
          method="PATCH"
          path={`/teaching-assignments/${id}`}
          submitLabel="Simpan"
          resetOnSuccess={false}
          onSuccess={close}
          transform={(v) => ({ employeeId: v.employeeId, weeklyPeriods: Number(v.weeklyPeriods) })}
          className="grid gap-3 sm:grid-cols-2"
          fields={(e) => (
            <>
              <SelectField name="employeeId" label="Guru" defaultValue={employeeId} options={teachers} errors={e} />
              <TextField name="weeklyPeriods" label="Jam per minggu" type="number" defaultValue={weeklyPeriods} errors={e} />
            </>
          )}
        />
      )}
    </EditToggle>
  );
}
