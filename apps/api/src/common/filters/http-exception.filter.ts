import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { captureException } from '../sentry';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private onSystemError?: (message: string) => void;

  setSystemErrorNotifier(notifier: (message: string) => void) {
    this.onSystemError = notifier;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();

    // Prisma Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status = exception.code === 'P2025' ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      const message = exception.code === 'P2025' ? 'Record not found' : 'Database error';

      captureException(exception, {
        context: 'PrismaClientKnownRequestError',
        code: exception.code,
        path: request.url,
      });

      response.status(status).json({
        statusCode: status,
        timestamp,
        path: request.url,
        message,
        error: exception.message,
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      captureException(exception, {
        context: 'PrismaClientValidationError',
        path: request.url,
      });

      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path: request.url,
        message: 'Validation error',
        error: exception.message,
      });
      return;
    }

    // HttpException (NotFoundException, BadRequestException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      const message = typeof errorResponse === 'string' 
        ? errorResponse 
        : (errorResponse as any).message || 'An error occurred';

      if (status >= 500) {
        captureException(exception, {
          context: 'HttpException',
          status,
          path: request.url,
        });
        if (this.onSystemError) {
          this.onSystemError(`HTTP ${status}: ${message} (${request.method} ${request.url})`);
        }
      }

      response.status(status).json({
        statusCode: status,
        timestamp,
        path: request.url,
        message,
        ...(typeof errorResponse === 'object' && { details: errorResponse }),
      });
      return;
    }

    // Unknown errors — always send to Sentry + Telegram
    const err = exception instanceof Error ? exception : new Error(String(exception));
    captureException(err, {
      context: 'UnknownError',
      path: request.url,
    });
    if (this.onSystemError) {
      this.onSystemError(`Unknown: ${err.message} (${request.method} ${request.url})`);
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({
      statusCode: status,
      timestamp,
      path: request.url,
      message: 'Internal server error',
    });
  }
}
