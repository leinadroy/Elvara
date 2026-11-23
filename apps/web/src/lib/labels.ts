import { TEACHING_ROLES } from "@smart-school/contracts";

/** Label pilihan yang dipakai komponen server dan client (jangan taruh di modul "use client"). */
export const TEACHING_ROLE_OPTIONS = [
  { value: TEACHING_ROLES[0], label: "Guru utama" },
  { value: TEACHING_ROLES[1], label: "Pendamping" },
];
