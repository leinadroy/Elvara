"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CreateEmployeeSchema, EMPLOYMENT_TYPE_LABELS, UpdateEmployeeSchema, type EmployeeDetail } from "@smart-school/contracts";
import { CheckboxField, SelectField, TextField, toOptions } from "@/components/form";
import { PersonFields } from "@/components/people-form-fields";
import { RecordForm } from "@/components/record";
import { apiSend } from "@/lib/api-client";

/** Record pegawai: header form (insert/edit) dengan toolbar tetap; tab detail diberikan pemanggil. */
export function EmployeeRecord({ employee, readOnly, badges, tabs }: { employee?: EmployeeDetail; readOnly?: boolean; badges?: ReactNode; tabs?: ReactNode }) {
  const router = useRouter();
  return (
    <RecordForm<{ id: string } | undefined>
      mode={employee ? "edit" : "insert"}
      backHref="/admin/employees"
      backLabel="Daftar pegawai"
      title={employee ? employee.fullName : "Pegawai baru"}
      subtitle={employee ? `${employee.position} · No. ${employee.employeeNumber}` : "Kolom bertanda * wajib diisi."}
      badges={badges}
      readOnly={readOnly}
      schema={employee ? UpdateEmployeeSchema : CreateEmployeeSchema}
      booleans={["isTeacher"]}
      submit={(v) => (employee ? apiSend("PATCH", `/employees/${employee.id}`, v) : apiSend<{ id: string }>("POST", "/employees", v))}
      onSaved={(data) => {
        if (!employee && data) router.replace(`/admin/employees/${data.id}?tab=akun`);
      }}
      fields={(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {employee ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Nomor pegawai</span>
                <span className="flex h-8 items-center text-sm">{employee.employeeNumber}</span>
              </div>
            ) : (
              <TextField name="employeeNumber" label="Nomor pegawai" required errors={errors} description="Tidak dapat diubah setelah disimpan." />
            )}
            <TextField name="nip" label="NIP" defaultValue={employee?.nip} errors={errors} inputMode="numeric" description="18 digit, boleh dikosongkan." />
            <TextField name="joinedAt" label="Mulai bertugas" type="date" defaultValue={employee?.joinedAt} errors={errors} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name="position" label="Jabatan" required defaultValue={employee?.position} errors={errors} />
            <SelectField name="employmentType" label="Kepegawaian" options={toOptions(EMPLOYMENT_TYPE_LABELS)} defaultValue={employee?.employmentType ?? "PERMANENT"} errors={errors} />
            {employee && (
              <SelectField name="status" label="Status" options={[{ value: "ACTIVE", label: "Aktif" }, { value: "INACTIVE", label: "Nonaktif" }]} defaultValue={employee.status} errors={errors} />
            )}
          </div>
          <CheckboxField name="isTeacher" label="Mengajar (guru)" defaultChecked={employee?.isTeacher} />
          <PersonFields errors={errors} person={employee?.person} />
        </>
      )}
      tabs={tabs}
    />
  );
}
