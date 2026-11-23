"use client";

import { useEffect, useState } from "react";
import { AUDIENCE_LABELS, CreateAnnouncementSchema, ROLE_LABELS } from "@smart-school/contracts";
import { SelectField, TextAreaField, TextField, toOptions } from "@/components/form";
import { InlineForm } from "@/components/inline-form";
import { apiSend } from "@/lib/api-client";

/** Form pengumuman. Waktu terbit kosong = terbit sekarang; nilai datetime-local diubah ke ISO dengan zona browser. */
export function ComposeAnnouncement({ classes, buildings }: { classes: { value: string; label: string }[]; buildings: { value: string; label: string }[] }) {
  const [audience, setAudience] = useState("ALL");
  const [sent, setSent] = useState<number | null>(null);
  return (
    <div
      className="flex flex-col gap-2"
      onChange={(e) => {
        const el = e.target as unknown as HTMLSelectElement;
        if (el.name === "audienceKind") setAudience(el.value);
      }}
    >
      <InlineForm<{ recipientCount: number }>
        path="/announcements"
        schema={CreateAnnouncementSchema}
        submitLabel="Terbitkan"
        className="grid gap-3 sm:grid-cols-2"
        transform={(v) => ({
          ...v,
          publishAt: v.publishAt ? new Date(String(v.publishAt)).toISOString() : null,
          classGroupId: v.audienceKind === "CLASS_GROUP" ? v.classGroupId : null,
          buildingId: v.audienceKind === "BUILDING" ? v.buildingId : null,
          audienceRole: v.audienceKind === "ROLE" ? v.audienceRole : null,
        })}
        onSuccess={(d) => {
          setSent(d.recipientCount);
          setAudience("ALL"); // form dikosongkan, pilihan penerima kembali ke default
        }}
        fields={(errors) => (
          <>
            <div className="sm:col-span-2">
              <TextField name="title" label="Judul" required errors={errors} />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField name="body" label="Isi" required errors={errors} />
            </div>
            <SelectField name="audienceKind" label="Penerima" required defaultValue="ALL" options={toOptions(AUDIENCE_LABELS).filter((o) => (o.value !== "CLASS_GROUP" || classes.length) && (o.value !== "BUILDING" || buildings.length))}
              errors={errors}
            />
            {audience === "CLASS_GROUP" && <SelectField name="classGroupId" label="Rombel" required placeholder="Pilih rombel…" options={classes} errors={errors} />}
            {audience === "BUILDING" && <SelectField name="buildingId" label="Gedung" required placeholder="Pilih gedung…" options={buildings} errors={errors} />}
            {audience === "ROLE" && <SelectField name="audienceRole" label="Peran" required placeholder="Pilih peran…" options={toOptions(ROLE_LABELS)} errors={errors} />}
            <TextField name="publishAt" label="Terbit pada (opsional)" type="datetime-local" description="Kosongkan untuk terbit sekarang." errors={errors} />
          </>
        )}
      />
      {sent !== null && (
        <p role="status" className="text-sm text-muted-foreground">
          Pengumuman disimpan. {sent > 0 ? `${sent} penerima mendapat notifikasi dalam aplikasi.` : "Notifikasi dikirim saat waktu terbit tiba."}
        </p>
      )}
    </div>
  );
}

/** Tanda baca otomatis saat pengumuman tampil (baca ≠ persetujuan). */
export function MarkRead({ id }: { id: string }) {
  useEffect(() => {
    void apiSend("POST", `/announcements/${id}/read`);
  }, [id]);
  return null;
}
