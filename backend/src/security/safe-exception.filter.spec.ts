import { HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { vi } from 'vitest';
import { SafeExceptionFilter } from './safe-exception.filter.js';

describe('SafeExceptionFilter', () => {
  it('returns a generic response for unexpected internal errors', () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    new SafeExceptionFilter().catch(
      new Error('sensitive database connection detail'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'sensitive database connection detail',
    );
  });
});
