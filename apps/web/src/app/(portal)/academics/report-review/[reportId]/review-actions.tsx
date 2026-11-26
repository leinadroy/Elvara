"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/actions";
import { TextAreaField } from "@/components/form";
import { InlineForm } from "@/components/inline-form";

export function ReopenReport({ id }: { id: string }) {
  return <InlineForm path={`/report-cards/${id}/reopen`} submitLabel="Buka untuk revisi"
    fields={(errors) => <TextAreaField name="reason" label="Alasan membuka revisi" required errors={errors} />} />;
}

export function ReviewActions({ id, revision, ready }: { id: string; revision: boolean; ready: boolean }) {
  const router = useRouter();
  const done = () => router.push("/academics/report-review");
  return <div className="grid gap-4 sm:grid-cols-2">
    {ready && <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 font-semibold">Persetujuan</h2>
      {revision
        ? <InlineForm path={`/report-cards/${id}/approve`} submitLabel="Terbitkan versi revisi" onSuccess={done}
            fields={(errors) => <TextAreaField name="revisionReason" label="Alasan penerbitan revisi" required errors={errors} />} />
        : <ActionButton path={`/report-cards/${id}/approve`} label="Setujui dan terbitkan" variant="default" confirm="Terbitkan rapor ini?" onSuccess={done} />}
    </section>}
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 font-semibold">Pengembalian</h2>
      <InlineForm path={`/report-cards/${id}/return`} submitLabel="Kembalikan ke wali kelas" onSuccess={done}
        fields={(errors) => <TextAreaField name="reason" label="Catatan pengembalian" required errors={errors} />} />
    </section>
  </div>;
}
