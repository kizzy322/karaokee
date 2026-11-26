import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    let statusCode = 500;
    let details: string[] = [];

    if (error instanceof HttpException) {
      statusCode = error.getStatus();
      const response = error.getResponse();
      if (typeof response === 'string') {
        details = [response];
      } else if ('message' in response) {
        const message = response.message;
        details = Array.isArray(message) ? message.map(String) : [String(message)];
      }
    } else if (error instanceof QueryFailedError) {
      const code = (error.driverError as { code?: string }).code;
      switch (code) {
        case 'ER_DUP_ENTRY':
          statusCode = 409;
          details = ['A record with that unique value already exists'];
          break;
        case 'ER_ROW_IS_REFERENCED':
        case 'ER_ROW_IS_REFERENCED_2':
        case 'ER_NO_REFERENCED_ROW':
        case 'ER_NO_REFERENCED_ROW_2':
          statusCode = 409;
          details = ['The operation conflicts with a related record'];
          break;
        case 'ER_LOCK_DEADLOCK':
        case 'ER_LOCK_WAIT_TIMEOUT':
          statusCode = 409;
          details = ['The record changed in another request. Try again'];
          break;
      }
    }

    if (statusCode === 500) {
      this.logger.error(error instanceof Error ? error.name : 'Unexpected failure');
    }

    host.switchToHttp().getResponse<Response>().status(statusCode).json({
      success: false,
      statusCode,
      message: HttpStatus[statusCode]?.toLowerCase().replaceAll('_', ' ') ?? 'request failed',
      errors: details,
      timestamp: new Date().toISOString(),
    });
  }
}

