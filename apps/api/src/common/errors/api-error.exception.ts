import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiErrorException extends HttpException {
  constructor(message: string, code: string, status: HttpStatus, details?: Record<string, unknown>) {
    super(details ? { message, code, details } : { message, code }, status);
  }
}
