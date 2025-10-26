import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoggingService } from './logging.service';

function clientIp(req: any): string | null {
  const xf = (req.headers['x-forwarded-for'] || '') as string;
  return (xf.split(',')[0] || req.ip || req.connection?.remoteAddress || null)?.toString() ?? null;
}

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logging: LoggingService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any)?.message || exception.message
      : (exception as any)?.message || 'Internal server error';

    // persist error log
    await this.logging.log('API_ERROR', {
      userId: req.user?.userId ?? null,
      ip: clientIp(req),
      message: `${req.method} ${req.originalUrl || req.url} → ${status} ERROR`,
      details: {
        status,
        error: message,
        // include stack only in non-production to avoid noise
        stack: process.env.NODE_ENV === 'production' ? undefined : (exception as any)?.stack,
      },
    });

    // standard JSON response
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      const payload = typeof resp === 'object'
        ? resp
        : { statusCode: status, message: resp };
      res.status(status).json(payload);
    } else {
      res.status(status).json({ statusCode: status, message: 'Internal server error' });
    }
  }
}
