"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  LinkGuardianSchema,
  ROLE_LABELS,
  type GuardianLinkView,
  type GuardianListItem,
  type InvitationCreated,
  type RoleKey,
} from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { ActionButton, InvitationLink } from "@/components/actions";
import { CheckboxField, FormErrorSummary, SelectField, formToObject, toOptions, useApiForm } from "@/components/form";
import { apiSend } from "@/lib/api-client";

export function GuardianLinkActions({ link, studentName }: { link: GuardianLinkView; studentName: string }) {
  const [invitation, setInvitation] = useState<InvitationCreated | null>(null);
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {link.status === "PENDING" && (
          <ActionButton path={`/student-guardians/${link.id}/invitations`} label="Buat tautan baru" onSuccess={(d) => setInvitation(d as InvitationCreated)} />
        )}
        <ActionButton
          path={`/student-guardians/${link.id}/revoke`}
          label="Cabut hak"
          variant="destructive"
          confirm={`Cabut hak ${link.guardianName} atas data ${studentName}? Akses wali ini langsung berhenti.`}
        />
      </div>
      {invitation && <InvitationLink invitation={invitation} onClose={() => setInvitation(null)} />}
    </div>
  );
}

export function LinkGuardianForm({ studentId, guardians }: { studentId: string; guardians: GuardianListItem[] }) {
  const router = useRouter();
  const form = useApiForm();
  const [invitation, setInvitation] = useState<InvitationCreated | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const result = await form.run<InvitationCreated>({
      schema: LinkGuardianSchema,
      values: formToObject(formEl, ["isPrimaryContact", "canViewAcademic", "canViewAttendance", "canViewFinance"]),
      send: (v) => apiSend("POST", `/students/${studentId}/guardians`, v),
    });
    if (result) {
      setInvitation(result);
      formEl.reset();
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-medium">Tautkan orang tua / wali</h3>
      {invitation && <InvitationLink invitation={invitation} onClose={() => setInvitation(null)} />}
      {guardians.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada data wali yang bisa ditautkan.{" "}
          <Link href={`/admin/guardians/new?next=/admin/students/${studentId}`} className="underline">
            Tambah data wali
          </Link>
        </p>
      ) : (
        <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <FormErrorSummary error={form.error} fieldErrors={form.fieldErrors} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              name="guardianId"
              label="Wali"
              required
              placeholder="Pilih wali"
              options={guardians.map((g) => ({ value: g.id, label: `${g.fullName}${g.email ? ` (${g.email})` : " (belum ada email)"}` }))}
              errors={form.fieldErrors}
            />
            <SelectField name="relationship" label="Hubungan" required placeholder="Pilih hubungan" options={toOptions(GUARDIAN_RELATIONSHIP_LABELS)} errors={form.fieldErrors} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Hak dan kontak</legend>
            <CheckboxField name="isPrimaryContact" label="Kontak utama" />
            <CheckboxField name="canViewAcademic" label="Boleh melihat data akademik" defaultChecked />
            <CheckboxField name="canViewAttendance" label="Boleh melihat kehadiran" defaultChecked />
            <CheckboxField name="canViewFinance" label="Boleh melihat tagihan" />
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Wali baru bisa melihat data anak setelah membuka tautan undangan dan memverifikasinya.{" "}
            <Link href={`/admin/guardians/new?next=/admin/students/${studentId}`} className="underline">
              Wali belum terdaftar?
            </Link>
          </p>
          <div>
            <Button type="submit" disabled={form.pending}>
              {form.pending ? "Menautkan…" : "Tautkan dan buat undangan"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Undangan akun portal untuk siswa atau pegawai. */
export function AccountInvite({ personId, role, roles, hasEmail }: { personId: string; role?: RoleKey; roles?: readonly RoleKey[]; hasEmail: boolean }) {
  const [invitation, setInvitation] = useState<InvitationCreated | null>(null);
  const [selected, setSelected] = useState<RoleKey | undefined>(role ?? roles?.[0]);
  if (!hasEmail) return <p className="text-sm text-muted-foreground">Isi email terlebih dahulu untuk mengirim undangan akun.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        {roles && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Peran
            <select className="h-8 rounded-lg border px-2 text-sm text-foreground" value={selected} onChange={(e) => setSelected(e.target.value as RoleKey)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        )}
        <ActionButton path={`/people/${personId}/invitations`} body={{ role: selected }} label="Buat undangan akun" onSuccess={(d) => setInvitation(d as InvitationCreated)} />
      </div>
      {invitation && <InvitationLink invitation={invitation} onClose={() => setInvitation(null)} />}
    </div>
  );
}
