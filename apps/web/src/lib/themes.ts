export const THEMES = [
  { id: "sekolah", label: "Sekolah (utama)", swatch: "#155e63" },
  { id: "laut", label: "Laut", swatch: "#2456a6" },
  { id: "netral", label: "Netral", swatch: "#262626" },
  { id: "gelap", label: "Gelap", swatch: "#0f2228" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

export const STORAGE_KEYS = { theme: "ss-theme", left: "ss-left-sidebar", right: "ss-right-sidebar" } as const;

/**
 * Dijalankan di <head> sebelum halaman digambar: menerapkan tema dan status sidebar dari localStorage
 * agar tidak ada kedipan. Hanya nilai yang dikenal yang dipakai.
 */
export const PREFERENCES_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage;var t=s.getItem("${STORAGE_KEYS.theme}");if(t&&${JSON.stringify(
  ["sekolah", "laut", "netral", "gelap"],
)}.indexOf(t)>-1)d.setAttribute("data-theme",t);if(s.getItem("${STORAGE_KEYS.left}")==="closed")d.setAttribute("data-left-sidebar","closed");if(s.getItem("${STORAGE_KEYS.right}")==="closed")d.setAttribute("data-right-sidebar","closed")}catch(e){}})()`;
