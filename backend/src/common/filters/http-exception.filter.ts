import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AnalyticsService } from '../../modules/admin/analytics.service';

/** RFC 7807–style problem detail for API error responses */
export interface ProblemDetail {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null) {
        const body = payload as Record<string, unknown>;
        message = (body.message as string | string[]) ?? message;
        error = (body.error as string) ?? exception.name;
      } else {
        message = String(payload);
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      // Never expose raw DB/stack errors to clients for 500s
      const isInternal = status === HttpStatus.INTERNAL_SERVER_ERROR;
      message = isInternal ? 'Something went wrong. Please try again.' : exception.message;
      error = exception.name;
      this.logger.warn(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    // Track 5xx errors for admin analytics (fire-and-forget)
    if (status >= 500) {
      this.analyticsService.incrementErrorsToday();
    }

    const body: ProblemDetail = {
      statusCode: status,
      message,
      error,
      path: req.url,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(body);
  }
}
