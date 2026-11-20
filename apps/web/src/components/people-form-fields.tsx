"use client";

import { GENDER_LABELS, type PersonView } from "@smart-school/contracts";
import { SelectField, TextAreaField, TextField, toOptions, type FieldErrors } from "@/components/form";

/** Field data diri yang sama untuk siswa, pegawai, dan wali. */
export function PersonFields({ errors, person, emailRequired }: { errors: FieldErrors; person?: PersonView; emailRequired?: boolean }) {
  return (
    <>
      <TextField name="fullName" label="Nama lengkap" required defaultValue={person?.fullName} errors={errors} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="gender" label="Jenis kelamin" placeholder="Tidak diisi" options={toOptions(GENDER_LABELS)} defaultValue={person?.gender} errors={errors} />
        <TextField name="birthPlace" label="Tempat lahir" defaultValue={person?.birthPlace} errors={errors} />
        <TextField name="birthDate" label="Tanggal lahir" type="date" defaultValue={person?.birthDate} errors={errors} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          required={emailRequired}
          defaultValue={person?.email}
          errors={errors}
          description="Dipakai untuk undangan akun."
        />
        <TextField name="phone" label="Telepon" type="tel" inputMode="tel" defaultValue={person?.phone} errors={errors} />
      </div>
      <TextAreaField name="address" label="Alamat" defaultValue={person?.address} errors={errors} />
    </>
  );
}
