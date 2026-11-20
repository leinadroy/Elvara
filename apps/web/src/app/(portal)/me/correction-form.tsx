"use client";

import { useRouter } from "next/navigation";
import { CreateCorrectionSchema, GENDER_LABELS, type PersonView } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, SelectField, TextAreaField, TextField, toOptions, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";

/**
 * Pengajuan koreksi data diri. Form diisi nilai saat ini; hanya field yang diubah yang dikirim.
 * Data resmi baru berubah setelah tata usaha menyetujui.
 */
export function CorrectionForm({ person }: { person: PersonView }) {
  const router = useRouter();
  const form = useApiForm();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const current: Record<string, string> = {
      fullName: person.fullName,
      gender: person.gender ?? "",
      birthDate: person.birthDate ?? "",
      birthPlace: person.birthPlace ?? "",
      phone: person.phone ?? "",
      address: person.address ?? "",
    };
    const changes: Record<string, string | null> = {};
    for (const key of Object.keys(current)) {
      const v = String(fd.get(key) ?? "").trim();
      if (v !== current[key]) changes[key] = v === "" ? null : v;
    }
    const formEl = e.currentTarget;
    const ok = await form.run({
      schema: CreateCorrectionSchema,
      values: { changes, reason: fd.get("reason") },
      send: (v) => apiSend("POST", "/me/corrections", v),
    });
    if (ok) {
      formEl.reset();
      router.refresh();
    }
  }

  const fe = Object.fromEntries(Object.entries(form.fieldErrors).map(([k, v]) => [k.replace(/^changes\.?/, "") || "_", v]));

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <p className="font-medium">Ajukan koreksi data diri</p>
        <p className="text-sm text-muted-foreground">Ubah isian yang salah, jelaskan alasannya, lalu kirim. Tata usaha akan meninjau.</p>
      </div>
      <FormErrorSummary error={form.error} fieldErrors={fe} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="fullName" label="Nama lengkap" defaultValue={person.fullName} errors={fe} />
        <SelectField name="gender" label="Jenis kelamin" placeholder="Tidak diisi" options={toOptions(GENDER_LABELS)} defaultValue={person.gender} errors={fe} />
        <TextField name="birthPlace" label="Tempat lahir" defaultValue={person.birthPlace} errors={fe} />
        <TextField name="birthDate" label="Tanggal lahir" type="date" defaultValue={person.birthDate} errors={fe} />
        <TextField name="phone" label="Telepon" type="tel" defaultValue={person.phone} errors={fe} />
      </div>
      <TextAreaField name="address" label="Alamat" defaultValue={person.address} errors={fe} />
      <TextAreaField name="reason" label="Alasan koreksi" required errors={fe} description="Mis. nama di akta kelahiran berbeda; nomor telepon sudah ganti." />
      <div>
        <Button type="submit" disabled={form.pending}>
          {form.pending ? "Mengirim…" : "Kirim pengajuan"}
        </Button>
      </div>
    </form>
  );
}
