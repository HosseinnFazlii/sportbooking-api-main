import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { LoggingService } from './logging.service';

export const NO_API_LOG_KEY = 'NO_API_LOG';

function clientIp(req: any): string | null {
  const xf = (req.headers['x-forwarded-for'] || '') as string;
  return (xf.split(',')[0] || req.ip || req.connection?.remoteAddress || null)?.toString() ?? null;
}

function sanitize(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  const secretKeys = ['password', 'newPassword', 'otp', 'code', 'token'];
  for (const k of Object.keys(clone)) {
    if (secretKeys.includes(k)) clone[k] = '***';
    else if (typeof clone[k] === 'object') clone[k] = sanitize(clone[k]);
  }
  return clone;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logging: LoggingService, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const now = Date.now();

    // skip logging for handlers/classes annotated with @NoApiLog()
    const skip = this.reflector.getAllAndOverride<boolean>(NO_API_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // also skip Swagger UI & static
    const url: string = req.originalUrl || req.url || '';
    const shouldSkip =
      skip ||
      url.startsWith('/docs') ||
      url.startsWith('/favicon') ||
      url.includes('/uploads/');

    const details = shouldSkip
      ? null
      : {
          method: req.method,
          url,
          query: sanitize(req.query),
          body: sanitize(req.body),
          ua: req.headers['user-agent'],
        };

    return next.handle().pipe(
      tap(async () => {
        if (shouldSkip) return;
        const took = Date.now() - now;
        await this.logging.log('API_ACCESS', {
          userId: req.user?.userId ?? null,
          ip: clientIp(req),
          message: `${req.method} ${url} → ${req.res?.statusCode ?? 200} (${took}ms)`,
          details: { ...details, status: req.res?.statusCode ?? 200, tookMs: took },
        });
      }),
      catchError((err) => {
        // Let the exception filter persist the error; no double logging here.
        throw err;
      }),
    );
  }
}
