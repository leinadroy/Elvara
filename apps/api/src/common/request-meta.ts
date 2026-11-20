import type { Request } from 'express';
import { REQUEST_ID_HEADER } from '@smart-school/contracts';

export interface RequestMeta {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
}

export function requestMeta(req: Request): RequestMeta {
  return {
    requestId: (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? null,
    ip: req.ip ?? null,
    userAgent: req.header('user-agent')?.slice(0, 300) ?? null,
  };
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
