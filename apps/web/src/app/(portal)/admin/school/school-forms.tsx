"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateBuildingSchema, CreateFloorSchema, CreateRoomSchema, ROOM_TYPE_LABELS } from "@smart-school/contracts";
import type { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/actions";
import { FormErrorSummary, SelectField, TextField, formToObject, toOptions, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";

/** Form kecil yang dibuka dari tombol, dikirim ke API, lalu menyegarkan halaman. */
function InlineForm({
  openLabel,
  title,
  schema,
  path,
  extra,
  children,
}: {
  openLabel: string;
  title: string;
  schema: ZodType;
  path: string;
  extra?: Record<string, unknown>;
  children: (errors: Record<string, string[]>) => React.ReactNode;
}) {
  const router = useRouter();
  const form = useApiForm();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          {openLabel}
        </Button>
      </div>
    );
  }
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await form.run({ schema, values: { ...formToObject(e.currentTarget), ...extra }, send: (v) => apiSend("POST", path, v) });
    if (ok) {
      setOpen(false);
      router.refresh();
    }
  }
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
      {children(form.fieldErrors)}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={form.pending}>
          {form.pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

export function AddBuildingForm() {
  return (
    <InlineForm openLabel="Tambah gedung" title="Gedung baru" schema={CreateBuildingSchema} path="/buildings">
      {(errors) => (
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <TextField name="code" label="Kode" required errors={errors} placeholder="C" />
          <TextField name="name" label="Nama" required errors={errors} placeholder="Gedung C" />
        </div>
      )}
    </InlineForm>
  );
}

export function AddFloorForm({ buildingId, nextLevel }: { buildingId: string; nextLevel: number }) {
  return (
    <InlineForm openLabel="Tambah lantai" title="Lantai baru" schema={CreateFloorSchema} path={`/buildings/${buildingId}/floors`}>
      {(errors) => (
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <TextField name="level" label="Lantai ke-" type="number" required defaultValue={nextLevel} errors={errors} />
          <TextField name="name" label="Nama" required defaultValue={`Lantai ${nextLevel}`} errors={errors} />
        </div>
      )}
    </InlineForm>
  );
}

export function AddRoomForm({ floorId }: { floorId: string }) {
  return (
    <InlineForm openLabel="Tambah ruang" title="Ruang baru" schema={CreateRoomSchema} path="/rooms" extra={{ floorId }}>
      {(errors) => (
        <div className="grid gap-3 sm:grid-cols-4">
          <TextField name="code" label="Kode" required errors={errors} />
          <TextField name="name" label="Nama" required errors={errors} />
          <SelectField name="type" label="Jenis" options={toOptions(ROOM_TYPE_LABELS)} defaultValue="CLASSROOM" errors={errors} />
          <TextField name="capacity" label="Kapasitas" type="number" errors={errors} />
        </div>
      )}
    </InlineForm>
  );
}

export function RoomActiveToggle({ roomId, isActive, name }: { roomId: string; isActive: boolean; name: string }) {
  return (
    <ActionButton
      method="PATCH"
      path={`/rooms/${roomId}`}
      body={{ isActive: !isActive }}
      size="xs"
      variant="ghost"
      label={isActive ? "Nonaktifkan" : "Aktifkan"}
      confirm={isActive ? `Tandai ${name} tidak dipakai?` : undefined}
    />
  );
}
