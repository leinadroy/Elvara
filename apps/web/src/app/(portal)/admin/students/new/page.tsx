import type { Metadata } from "next";
import { RecordTabs } from "@/components/record";
import { StudentRecord } from "../student-form";

export const metadata: Metadata = { title: "Tambah siswa" };

export default function NewStudentPage() {
  const locked = "Simpan data siswa terlebih dahulu.";
  return (
    <StudentRecord
      tabs={
        <RecordTabs
          basePath="/admin/students/new"
          active=""
          tabs={[
            { key: "wali", label: "Orang tua / wali", disabled: locked },
            { key: "dokumen", label: "Dokumen", disabled: locked },
            { key: "akun", label: "Akun portal", disabled: locked },
          ]}
        />
      }
    />
  );
}
