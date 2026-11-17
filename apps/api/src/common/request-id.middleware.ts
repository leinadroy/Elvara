import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '@smart-school/contracts';

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Menempelkan requestId ke setiap permintaan dan respons, untuk log dan dukungan pengguna. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
