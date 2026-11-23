"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { AssignHomeroomSchema, UpdateClassGroupSchema, type ClassGroupDetail, type EnrollmentView, type EnrollResult } from "@smart-school/contracts";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { RecordForm } from "@/components/record";
import { Button } from "@/components/ui/button";
import { apiGetClient, apiSend } from "@/lib/api-client";

type Opt = { value: string; label: string };

export function ClassRecord({ c, readOnly, grades, programs, rooms, tabs }: { c: ClassGroupDetail; readOnly: boolean; grades: Opt[]; programs: Opt[]; rooms: Opt[]; tabs: ReactNode }) {
  return (
    <RecordForm
      mode="edit"
      backHref="/academics/classes"
      backLabel="Daftar rombel"
      title={`Rombel ${c.code}`}
      subtitle={`${c.academicYear.name} · ${c.gradeLevel.name} · ${c.activeCount}/${c.capacity} siswa · Wali kelas: ${c.homeroom?.fullName ?? "belum ada"}`}
      schema={UpdateClassGroupSchema}
      readOnly={readOnly}
      submit={(v) => apiSend("PATCH", `/class-groups/${c.id}`, v)}
      fields={(e) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField name="code" label="Kode rombel" required defaultValue={c.code} errors={e} />
          <SelectField name="gradeLevelId" label="Tingkat" required defaultValue={c.gradeLevel.id} options={grades} errors={e} />
          <SelectField name="programId" label="Program" defaultValue={c.program?.id} placeholder="Tanpa program" options={programs} errors={e} />
          <SelectField name="mainRoomId" label="Ruang utama" defaultValue={c.mainRoom?.id} placeholder="Belum ditentukan" options={rooms} errors={e} />
          <TextField name="capacity" label="Kapasitas" type="number" inputMode="numeric" required defaultValue={c.capacity} errors={e} />
          <SelectField
            name="status"
            label="Status"
            defaultValue={c.status}
            options={[
              { value: "ACTIVE", label: "Aktif" },
              { value: "INACTIVE", label: "Nonaktif" },
            ]}
            errors={e}
          />
        </div>
      )}
      tabs={tabs}
    />
  );
}

export function HomeroomForm({ classId, teachers, today }: { classId: string; teachers: Opt[]; today: string }) {
  return (
    <InlineForm
      path={`/class-groups/${classId}/homeroom`}
      schema={AssignHomeroomSchema}
      submitLabel="Tetapkan wali kelas"
      className="grid gap-3 sm:grid-cols-2"
      fields={(e) => (
        <>
          <SelectField name="employeeId" label="Guru" required placeholder="Pilih guru…" options={teachers} errors={e} />
          <TextField name="validFrom" label="Berlaku mulai" type="date" required defaultValue={today} errors={e} description="Wali kelas sebelumnya berakhir sehari sebelumnya." />
        </>
      )}
    />
  );
}

/** Pilih siswa aktif yang belum punya rombel pada tanggal mulai, lalu tempatkan sekaligus. Penolakan ditampilkan per siswa. */
export function EnrollPanel({ classId, today }: { classId: string; today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ id: string; fullName: string; nis: string }[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const res = await apiGetClient<{ id: string; fullName: string; nis: string }[]>(`/class-groups/${classId}/candidates?date=${date}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) setList(res.data);
      else setError(res.error.message);
    }, 250);
    return () => window.clearTimeout(t);
  }, [classId, date, q, result]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Mulai berlaku
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Cari nama atau NIS
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground" />
        </label>
      </div>
      {list === null ? (
        <p className="text-sm text-muted-foreground">Memuat siswa…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada siswa aktif tanpa rombel pada tanggal ini.</p>
      ) : (
        <ul className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
          {list.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="size-4 accent-primary" />
                {s.fullName} <span className="text-xs text-muted-foreground">{s.nis}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!picked.size || pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await apiSend<EnrollResult>("POST", `/class-groups/${classId}/enrollments`, { studentIds: [...picked], validFrom: date });
              if (!res.ok) return setError(res.error.message);
              setResult(res.data);
              setPicked(new Set());
              router.refresh();
            })
          }
        >
          {pending ? "Menempatkan…" : `Tempatkan ${picked.size || ""} siswa`}
        </Button>
        {list && list.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(new Set(list.map((s) => s.id)))}>
            Pilih semua
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>{result.enrolled} siswa ditempatkan.</p>
          {result.rejected.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-destructive">
              {result.rejected.map((r) => (
                <li key={r.studentId}>
                  {r.fullName}: {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Pindah kelas atau akhiri penempatan. Penempatan lama ditutup, tidak ditimpa. */
export function EnrollmentActions({ e, classes, today }: { e: EnrollmentView; classes: Opt[]; today: string }) {
  const [mode, setMode] = useState<"move" | "end" | null>(null);
  if (e.validTo) return null;
  if (!mode)
    return (
      <span className="flex gap-1">
        <Button type="button" variant="ghost" size="xs" onClick={() => setMode("move")}>
          Pindah
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => setMode("end")}>
          Akhiri
        </Button>
      </span>
    );
  return (
    <div className="rounded-lg border bg-muted/40 p-2">
      <InlineForm
        path={mode === "move" ? `/enrollments/${e.id}/move` : `/enrollments/${e.id}/end`}
        submitLabel={mode === "move" ? "Pindahkan" : "Akhiri penempatan"}
        onSuccess={() => setMode(null)}
        className="grid gap-2 sm:grid-cols-3"
        fields={(err) =>
          mode === "move" ? (
            <>
              <SelectField name="toClassGroupId" label="Ke rombel" required placeholder="Pilih…" options={classes} errors={err} />
              <TextField name="date" label="Tanggal pindah" type="date" required defaultValue={today} errors={err} />
              <TextField name="reason" label="Alasan" required errors={err} />
            </>
          ) : (
            <>
              <TextField name="validTo" label="Tanggal terakhir" type="date" required defaultValue={today} errors={err} />
              <TextField name="reason" label="Alasan" required errors={err} description="mis. lulus, mutasi keluar" />
            </>
          )
        }
      />
      <Button type="button" variant="ghost" size="xs" onClick={() => setMode(null)}>
        Batal
      </Button>
    </div>
  );
}
