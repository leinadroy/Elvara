import { HealthResponseSchema, type HealthResponse } from "@smart-school/contracts";

/** Base URL NestJS API untuk pemanggilan dari server Next.js (bukan dari browser). */
export const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unreachable" | "invalid-response"; detail: string };

export async function getApiHealth(): Promise<ApiResult<HealthResponse>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
  } catch (err) {
    return { ok: false, reason: "unreachable", detail: err instanceof Error ? err.message : String(err) };
  }
  const parsed = HealthResponseSchema.safeParse(await res.json().catch(() => null));
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, reason: "invalid-response", detail: `HTTP ${res.status}` };
}
