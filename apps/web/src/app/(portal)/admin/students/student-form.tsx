"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CreateStudentSchema, STUDENT_STATUS_LABELS, UpdateStudentSchema, type StudentDetail } from "@smart-school/contracts";
import { SelectField, TextField, toOptions } from "@/components/form";
import { PersonFields } from "@/components/people-form-fields";
import { RecordForm } from "@/components/record";
import { apiSend } from "@/lib/api-client";

/** Record siswa: header form (insert/edit) dengan toolbar tetap; tab detail diberikan pemanggil. */
export function StudentRecord({ student, readOnly, badges, tabs }: { student?: StudentDetail; readOnly?: boolean; badges?: ReactNode; tabs?: ReactNode }) {
  const router = useRouter();
  return (
    <RecordForm<{ id: string } | undefined>
      mode={student ? "edit" : "insert"}
      backHref="/admin/students"
      backLabel="Daftar siswa"
      title={student ? student.fullName : "Siswa baru"}
      subtitle={student ? `NIS ${student.nis}` : "Kolom bertanda * wajib diisi."}
      badges={badges}
      readOnly={readOnly}
      schema={student ? UpdateStudentSchema : CreateStudentSchema}
      submit={(v) => (student ? apiSend("PATCH", `/students/${student.id}`, v) : apiSend<{ id: string }>("POST", "/students", v))}
      onSaved={(data) => {
        if (!student && data) router.replace(`/admin/students/${data.id}?tab=wali`);
      }}
      fields={(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {student ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">NIS</span>
                <span className="flex h-8 items-center text-sm">{student.nis}</span>
              </div>
            ) : (
              <TextField name="nis" label="NIS" required errors={errors} inputMode="numeric" description="Tidak dapat diubah setelah disimpan." />
            )}
            <TextField name="nisn" label="NISN" defaultValue={student?.nisn} errors={errors} inputMode="numeric" description="10 digit, boleh dikosongkan." />
            <TextField name="enrolledAt" label="Tanggal masuk" type="date" defaultValue={student?.enrolledAt} errors={errors} />
          </div>
          {student && (
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField name="status" label="Status" options={toOptions(STUDENT_STATUS_LABELS)} defaultValue={student.status} errors={errors} />
              <TextField name="exitedAt" label="Tanggal keluar" type="date" defaultValue={student.exitedAt} errors={errors} />
            </div>
          )}
          <PersonFields errors={errors} person={student?.person} />
        </>
      )}
      tabs={tabs}
    />
  );
}
