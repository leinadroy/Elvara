import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '@smart-school/contracts';

/**
 * Satu baris log per permintaan: requestId, metode, path tanpa query string (query bisa memuat nama/NIS),
 * status, durasi, dan pengguna bila sudah masuk. Health check tidak dicatat agar log tidak bising.
 * Dengan LOG_JSON atau di produksi, Nest menulisnya sebagai JSON (lihat main.ts).
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const started = process.hrtime.bigint();
    const path = (req.originalUrl ?? req.url).split('?')[0]!;
    res.on('finish', () => {
      if (path.endsWith('/health')) return;
      const entry = {
        requestId: req.header(REQUEST_ID_HEADER),
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e5) / 10,
        userId: req.auth?.userId ?? null,
      };
      if (res.statusCode >= 500) this.logger.error(entry);
      else if (res.statusCode >= 400) this.logger.warn(entry);
      else this.logger.log(entry);
    });
    next();
  }
}
