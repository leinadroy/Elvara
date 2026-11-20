import type { ApiError } from "@smart-school/contracts";

export type ClientResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError };

/**
 * Panggil API dari browser lewat rewrite /api/v1 (satu origin, cookie sesi ikut terkirim).
 * Tidak pernah melempar: kesalahan jaringan dikembalikan sebagai ApiError agar form bisa menampilkannya.
 */
export async function apiSend<T = unknown>(method: "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<ClientResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "Koneksi terputus. Periksa jaringan lalu coba lagi.", requestId: "-" } };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: (json as ApiError | null) ?? { code: "ERROR", message: `Permintaan gagal (HTTP ${res.status}).`, requestId: res.headers.get("x-request-id") ?? "-" },
    };
  }
  return { ok: true, data: json as T };
}

export async function apiGetClient<T>(path: string): Promise<ClientResult<T>> {
  try {
    const res = await fetch(`/api/v1${path}`, { credentials: "same-origin" });
    const json = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: json as T } : { ok: false, status: res.status, error: json as ApiError };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "Koneksi terputus.", requestId: "-" } };
  }
}
