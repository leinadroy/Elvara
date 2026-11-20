import type { Metadata } from "next";
import { RecordTabs } from "@/components/record";
import { EmployeeRecord } from "../employee-form";

export const metadata: Metadata = { title: "Tambah pegawai" };

export default function NewEmployeePage() {
  const locked = "Simpan data pegawai terlebih dahulu.";
  return (
    <EmployeeRecord
      tabs={
        <RecordTabs
          basePath="/admin/employees/new"
          active=""
          tabs={[
            { key: "akun", label: "Akun portal", disabled: locked },
            { key: "dokumen", label: "Dokumen", disabled: locked },
          ]}
        />
      }
    />
  );
}
