import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = response.getHeader('X-Request-Id')?.toString();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse &&
        'code' in exceptionResponse
      ) {
        response.status(status).json(exceptionResponse);
        return;
      }
    }

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          service: 'api',
          requestId,
          route: `${request.method} ${request.url}`,
          message,
          metadata: {
            stack: exception instanceof Error ? exception.stack : undefined,
          },
        }),
      );
    }

    response.status(status).json({
      code: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message,
      requestId,
    });
  }
}
