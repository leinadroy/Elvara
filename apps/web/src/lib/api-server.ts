import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ApiError, Me } from "@smart-school/contracts";
import { API_URL } from "./api";

export type ServerResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError };

/**
 * Panggil API dari Server Component dengan cookie sesi pengguna.
 * Membaca cookie, jadi pemanggilnya harus berada di dalam <Suspense>.
 * 401 → arahkan ke /login; 404 → halaman tidak ditemukan; status lain dikembalikan untuk ditampilkan.
 */
export async function apiGet<T>(path: string, opts: { allow404?: boolean } = {}): Promise<ServerResult<T>> {
  const cookieHeader = (await cookies()).toString();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { cookie: cookieHeader, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: { code: "API_UNREACHABLE", message: "Server aplikasi tidak dapat dihubungi. Coba lagi sebentar lagi.", requestId: "-" },
    };
  }
  if (res.status === 401) redirect("/login");
  if (res.status === 404 && !opts.allow404) notFound();
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    return {
      ok: false,
      status: res.status,
      error: body ?? { code: "ERROR", message: `Permintaan gagal (HTTP ${res.status}).`, requestId: res.headers.get("x-request-id") ?? "-" },
    };
  }
  return { ok: true, data: (await res.json()) as T };
}

/**
 * Pengguna yang sedang masuk. Sesi tidak valid (401) sudah diarahkan ke /login oleh apiGet.
 * Gangguan lain (API mati, 5xx) dilempar ke error boundary portal, bukan dianggap "belum login".
 */
export async function getMe(): Promise<Me> {
  const res = await apiGet<Me>("/auth/me");
  if (!res.ok) throw new Error(`Profil pengguna tidak dapat dimuat (${res.error.code}, requestId ${res.error.requestId}).`);
  return res.data;
}

/** searchParams Next → objek string sederhana (nilai ganda diambil yang pertama). */
export function flatParams(params: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

/** Ubah searchParams halaman menjadi query string untuk API (hanya nilai string tunggal). */
export function toQuery(params: Record<string, string | string[] | undefined>, allowed: readonly string[]): string {
  const q = new URLSearchParams();
  for (const key of allowed) {
    const v = params[key];
    if (typeof v === "string" && v !== "") q.set(key, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
