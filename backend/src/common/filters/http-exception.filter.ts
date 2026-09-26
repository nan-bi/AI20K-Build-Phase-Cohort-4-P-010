import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const DEFAULT_ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'invalid_request',
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.FORBIDDEN]: 'forbidden',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.CONFLICT]: 'conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limited',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi máy chủ nội bộ';
    let errors: any = null;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = (res as any).message || message;
        errors = (res as any).errors || null;
        code = (res as any).code;
      }
    } else if (exception instanceof Error && process.env.NODE_ENV !== 'production') {
      // Production không đưa lỗi nội bộ (vd. câu lệnh Prisma) ra ngoài; chi tiết vẫn có trong log.
      message = exception.message;
    }

    // Mã máy đọc được cho FE: mã tường minh của nghiệp vụ, nếu không thì suy từ HTTP status.
    code = code ?? DEFAULT_ERROR_CODES[status] ?? (status >= 500 ? 'internal_error' : 'error');

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${
        exception instanceof Error && !(exception instanceof HttpException) ? exception.message : message
      }`,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      code,
      message,
      errors,
    });
  }
}
