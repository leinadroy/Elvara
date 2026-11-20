import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, type ApiError } from '@smart-school/contracts';
import { Prisma } from '../generated/prisma/client.js';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
};

/** Exception dengan kode dan pesan per field yang dapat dibaca form di web. */
export class ApiException extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message, status);
  }
}

export const conflict = (message: string, fieldErrors?: Record<string, string[]>) =>
  new ApiException(HttpStatus.CONFLICT, 'CONFLICT', message, fieldErrors);

export const validationFailed = (message: string, fieldErrors?: Record<string, string[]>) =>
  new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', message, fieldErrors);

/** Mengubah setiap kesalahan menjadi format ApiError yang konsisten, tanpa membocorkan detail internal. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = String(req.headers[REQUEST_ID_HEADER] ?? 'unknown');

    // Pelanggaran unique constraint yang lolos dari pemeriksaan service (mis. race condition).
    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      const body: ApiError = { code: 'CONFLICT', message: 'Data dengan nilai unik yang sama sudah ada.', requestId };
      res.status(HttpStatus.CONFLICT).json(body);
      return;
    }

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) {
      this.logger.error({ requestId, path: req.originalUrl, err: exception });
    }

    const body: ApiError = {
      code:
        exception instanceof ApiException
          ? exception.code
          : (CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR')),
      message:
        exception instanceof HttpException && status < 500
          ? messageOf(exception)
          : 'Terjadi kesalahan pada server. Sebutkan requestId saat menghubungi dukungan.',
      requestId,
    };
    if (exception instanceof ApiException && exception.fieldErrors) body.fieldErrors = exception.fieldErrors;
    res.status(status).json(body);
  }
}

function messageOf(exception: HttpException): string {
  if (exception.getStatus() === 429) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return exception.message;
}
