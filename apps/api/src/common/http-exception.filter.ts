import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const requestId = request.header('x-request-id') ?? randomUUID();
    response.setHeader('X-Request-ID', requestId);

    let message = 'An unexpected error occurred.';
    let code = 'INTERNAL_ERROR';
    if (typeof exceptionResponse === 'string') message = exceptionResponse;
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as { message?: string | string[]; error?: string };
      if (Array.isArray(body.message)) message = body.message.join('; ');
      else if (body.message) message = body.message;
      if (status === 400) code = 'VALIDATION_ERROR';
      else if (status === 401) code = 'UNAUTHORIZED';
      else if (status === 403) code = 'FORBIDDEN';
      else if (status === 404) code = 'NOT_FOUND';
      else if (status === 409) code = 'CONFLICT';
      else if (status === 429) code = 'RATE_LIMITED';
    }

    response.status(status).json({ success: false, error: { code, message }, meta: { requestId } });
  }
}
