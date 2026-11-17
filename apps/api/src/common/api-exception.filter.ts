import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, type ApiError } from '@smart-school/contracts';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
};

/** Mengubah setiap kesalahan menjadi format ApiError yang konsisten, tanpa membocorkan detail internal. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = String(req.headers[REQUEST_ID_HEADER] ?? 'unknown');

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) {
      this.logger.error({ requestId, path: req.originalUrl, err: exception });
    }

    const body: ApiError = {
      code: CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'),
      message:
        exception instanceof HttpException && status < 500
          ? exception.message
          : 'Terjadi kesalahan pada server. Sebutkan requestId saat menghubungi dukungan.',
      requestId,
    };
    res.status(status).json(body);
  }
}
