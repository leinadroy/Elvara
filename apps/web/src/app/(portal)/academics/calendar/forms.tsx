"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CALENDAR_AUDIENCE_LABELS, CALENDAR_CATEGORY_LABELS, CalendarEventSchema, type CalendarEventView } from "@smart-school/contracts";
import { SelectField, TextAreaField, TextField, toOptions } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

type Opt = { value: string; label: string };
type SaveResult = { id: string; clashes: { title: string }[] };

/** Agenda baru atau ubah agenda. Disimpan sebagai draf; irisan dengan ujian/libur ditampilkan sebagai peringatan. */
export function CalendarEventForm({ grades, row, onDone }: { grades: Opt[]; row?: CalendarEventView; onDone?: () => void }) {
  const [audience, setAudience] = useState<string>(row?.audience ?? "ALL");
  const [clashes, setClashes] = useState<string[] | null>(null);
  return (
    <div
      className="flex flex-col gap-2"
      onChange={(e) => {
        const el = e.target as unknown as HTMLSelectElement;
        if (el.name === "audience") setAudience(el.value);
      }}
    >
      <InlineForm<SaveResult>
        method={row ? "PUT" : "POST"}
        path={row ? `/calendar/${row.id}` : "/calendar"}
        schema={CalendarEventSchema}
        submitLabel={row ? "Simpan perubahan" : "Simpan sebagai draf"}
        resetOnSuccess={!row}
        transform={(v) => ({ ...v, gradeLevelId: v.audience === "GRADE_LEVEL" ? v.gradeLevelId : null })}
        onSuccess={(d) => {
          setClashes(d.clashes.map((c) => c.title));
          if (!row) setAudience("ALL");
          onDone?.();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        fields={(e) => (
          <>
            <div className="sm:col-span-2">
              <TextField name="title" label="Judul" required defaultValue={row?.title} errors={e} />
            </div>
            <SelectField name="category" label="Kategori" required defaultValue={row?.category ?? "ACTIVITY"} options={toOptions(CALENDAR_CATEGORY_LABELS)} errors={e} />
            <TextField name="location" label="Lokasi" defaultValue={row?.location} errors={e} />
            <TextField name="startsOn" label="Mulai" type="date" required defaultValue={row?.startsOn} errors={e} />
            <TextField name="endsOn" label="Selesai" type="date" required defaultValue={row?.endsOn} errors={e} />
            <SelectField name="audience" label="Untuk" required defaultValue={row?.audience ?? "ALL"} options={toOptions(CALENDAR_AUDIENCE_LABELS)} errors={e} />
            {audience === "GRADE_LEVEL" ? <SelectField name="gradeLevelId" label="Tingkat" required defaultValue={row?.gradeLevel?.id} placeholder="Pilih…" options={grades} errors={e} /> : <div />}
            <div className="sm:col-span-2 lg:col-span-4">
              <TextAreaField name="description" label="Keterangan" defaultValue={row?.description} errors={e} />
            </div>
          </>
        )}
      />
      {clashes && clashes.length > 0 && (
        <p role="status" className="rounded-lg border border-primary bg-accent px-3 py-2 text-sm text-accent-foreground">
          Tersimpan. Tanggalnya beririsan dengan: {clashes.join(", ")}. Periksa kembali sebelum menerbitkan.
        </p>
      )}
    </div>
  );
}

export function EditEvent({ row, grades }: { row: CalendarEventView; grades: Opt[] }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Ubah
      </Button>
    );
  return (
    <div className="w-full rounded-lg border bg-muted/40 p-3">
      <CalendarEventForm grades={grades} row={row} />
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
        Tutup
      </Button>
    </div>
  );
}

export function CancelEvent({ id }: { id: string }) {
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
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await apiSend("POST", `/calendar/${id}/cancel`, { reason });
          if (!res.ok) return setError(res.error.message);
          router.refresh();
        });
      }}
    >
      <input aria-label="Alasan pembatalan" placeholder="Alasan pembatalan" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 rounded-lg border bg-background px-2 text-sm" />
      <Button type="submit" size="xs" disabled={pending || reason.trim().length < 5}>
        Batalkan agenda
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </form>
  );
}
