"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { WorkShiftSchema } from "@smart-school/contracts";
import { SelectField, TextField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

type Opt = { value: string; label: string };

export function NewShiftForm({ employees, rooms, today }: { employees: Opt[]; rooms: Opt[]; today: string }) {
  return (
    <InlineForm
      path="/work-shifts"
      schema={WorkShiftSchema}
      submitLabel="Tambah tugas"
      resetOnSuccess={false}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      fields={(e) => (
        <>
          <SelectField name="employeeId" label="Pegawai" required placeholder="Pilih…" options={employees} errors={e} />
          <TextField name="title" label="Tugas" required errors={e} placeholder="mis. Piket gerbang" />
          <TextField name="date" label="Tanggal" type="date" required defaultValue={today} errors={e} />
          <SelectField name="roomId" label="Lokasi" placeholder="Belum ditentukan" options={rooms} errors={e} />
          <TextField name="startTime" label="Mulai" type="time" required errors={e} />
          <TextField name="endTime" label="Selesai" type="time" required errors={e} />
          <div className="sm:col-span-2">
            <TextField name="note" label="Catatan" errors={e} description="Opsional, mis. bawa kunci gerbang." />
          </div>
        </>
      )}
    />
  );
}

/** Membatalkan tugas dengan alasan; tugas tidak dihapus agar riwayat tetap utuh. */
export function CancelShift({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Batalkan
      </Button>
    );
  return (
    <form
      method="post"
      className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await apiSend("POST", `/work-shifts/${id}/cancel`, { reason });
          if (!res.ok) return setError(res.error.message);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <input aria-label={`Alasan membatalkan ${title}`} placeholder="Alasan pembatalan" value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={200} className="h-8 rounded-lg border bg-background px-2 text-sm" />
      <Button type="submit" size="xs" disabled={pending || reason.trim().length < 5}>
        Batalkan tugas
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
        Tutup
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </form>
  );
}
