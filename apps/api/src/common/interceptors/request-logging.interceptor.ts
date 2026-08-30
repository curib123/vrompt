import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs/operators';

import { MetricsService } from '../../modules/common/metrics.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.recordResponse(
            request.method,
            request.path,
            response.statusCode,
            startedAt,
          ),
        error: (error: unknown) =>
          this.recordResponse(
            request.method,
            request.path,
            error instanceof HttpException
              ? error.getStatus()
              : response.statusCode >= 400
                ? response.statusCode
                : 500,
            startedAt,
          ),
      }),
    );
  }

  private recordResponse(
    method: string,
    path: string,
    statusCode: number,
    startedAt: number,
  ) {
    const durationMs = Date.now() - startedAt;
    this.metricsService.recordRequest(path, statusCode, durationMs);
    this.logger.log(JSON.stringify({ method, path, statusCode, durationMs }));
  }
}
