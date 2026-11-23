/** Modul tampilan per halaman, mengikuti penomoran dan warna infografis di docs/infographics. */
export type ModuleKey = "admin" | "akademik" | "siswa" | "pegawai" | "fasilitas" | "wali" | "command";

export const MODULES: Record<ModuleKey, { label: string; infographic: string }> = {
  admin: { label: "Administrasi sekolah", infographic: "01" },
  akademik: { label: "Manajemen akademik", infographic: "02" },
  siswa: { label: "Portal saya", infographic: "03" },
  pegawai: { label: "Guru & staf", infographic: "04" },
  wali: { label: "Portal wali", infographic: "09" },
  fasilitas: { label: "Fasilitas kampus", infographic: "12" },
  command: { label: "Command center", infographic: "21" },
};

const ROUTES: [RegExp, ModuleKey][] = [
  [/^\/academics/, "akademik"],
  [/^\/teacher/, "pegawai"],
  [/^\/staff/, "pegawai"],
  [/^\/student/, "siswa"],
  [/^\/(messages|management)/, "command"],
  [/^\/admin\/dashboard/, "command"],
  [/^\/admin\/employees/, "pegawai"],
  [/^\/admin\/school/, "fasilitas"],
  [/^\/admin\/academic-years/, "akademik"],
  [/^\/admin\/audit/, "command"],
  [/^\/admin\//, "admin"],
  [/^\/guardian/, "wali"],
  [/^\/me/, "siswa"],
  [/^\/dashboard/, "command"],
];

export function moduleFor(pathname: string): ModuleKey {
  return ROUTES.find(([re]) => re.test(pathname))?.[1] ?? "admin";
}
