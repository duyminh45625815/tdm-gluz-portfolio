import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: unknown): void;
}

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        response.status(status).json({
          statusCode: status,
          message: 'Too many login attempts. Please try again later.',
        });
        return;
      }

      if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
        response.status(status).json(exception.getResponse());
        return;
      }

      this.logInternalError();
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
      });
      return;
    }

    this.logInternalError();
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  private logInternalError(): void {
    this.logger.error('Internal request error; details withheld.');
  }
}
