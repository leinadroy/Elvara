"use client";

import { useState } from "react";
import { EMPLOYEE_ROLES, ROLE_LABELS, type AccountSummary, type RoleKey } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/actions";
import { formatDateTime } from "@/lib/format";

function RolesEditor({ account, onClose }: { account: AccountSummary; onClose: () => void }) {
  const editable: readonly RoleKey[] = account.roles.includes("STUDENT") ? ["STUDENT"] : EMPLOYEE_ROLES;
  const [roles, setRoles] = useState<RoleKey[]>(account.roles.filter((r) => r !== "GUARDIAN"));
  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Peran untuk {account.email}</legend>
      <div className="flex flex-wrap gap-3">
        {editable.map((r) => (
          <label key={r} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={roles.includes(r)}
              onChange={(e) => setRoles((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))}
            />
            {ROLE_LABELS[r]}
          </label>
        ))}
      </div>
      {account.roles.includes("GUARDIAN") && <p className="text-xs text-muted-foreground">Peran wali diatur lewat tautan wali di halaman siswa.</p>}
      <div className="flex gap-2">
        <ActionButton method="PUT" path={`/accounts/${account.id}/roles`} body={{ roles }} label="Simpan peran" variant="default" onSuccess={onClose} />
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Batal
        </Button>
      </div>
    </fieldset>
  );
}

export function AccountsTable({ accounts, currentUserId }: { accounts: AccountSummary[]; currentUserId: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="rounded-lg border">
      <Table>
        <caption className="sr-only">Daftar akun pengguna</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Akun</TableHead>
            <TableHead>Peran</TableHead>
            <TableHead className="hidden md:table-cell">Terakhir masuk</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id} className="align-top">
              <TableCell>
                <p className="font-medium">{a.personName ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
                {editing === a.id && <RolesEditor account={a} onClose={() => setEditing(null)} />}
              </TableCell>
              <TableCell className="whitespace-normal">{a.roles.map((r) => ROLE_LABELS[r]).join(", ")}</TableCell>
              <TableCell className="hidden md:table-cell">{formatDateTime(a.lastLoginAt)}</TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={a.status === "ACTIVE" ? "default" : "outline"}>{a.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</Badge>
                  <span className="text-xs text-muted-foreground">{a.mfaEnabled ? "2 langkah: aktif" : "2 langkah: belum"}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-2">
                  {a.roles.some((r) => r !== "GUARDIAN") && editing !== a.id && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(a.id)}>
                      Ubah peran
                    </Button>
                  )}
                  {a.id !== currentUserId && a.mfaEnabled && (
                    <ActionButton
                      path={`/accounts/${a.id}/mfa/reset`}
                      label="Reset 2 langkah"
                      confirm={`Reset verifikasi dua langkah untuk ${a.email}? Pakai ini bila ponsel pengguna hilang. Sesi akun ini akan berakhir dan pengguna perlu menyiapkan ulang.`}
                    />
                  )}
                  {a.id !== currentUserId &&
                    (a.status === "ACTIVE" ? (
                      <ActionButton path={`/accounts/${a.id}/disable`} label="Nonaktifkan" variant="destructive" confirm={`Nonaktifkan akun ${a.email}? Semua sesi akun ini langsung berakhir.`} />
                    ) : (
                      <ActionButton path={`/accounts/${a.id}/enable`} label="Aktifkan" />
                    ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
