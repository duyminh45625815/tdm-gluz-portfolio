import type { Connection } from 'mongoose';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports a connected database when Mongoose is connected', () => {
    const service = new HealthService({ readyState: 1 } as Connection);

    expect(service.getHealth()).toEqual({
      status: 'ok',
      database: 'connected',
      timestamp: expect.any(String),
    });
  });

  it('reports a disconnected database when Mongoose is not connected', () => {
    const service = new HealthService({ readyState: 0 } as Connection);

    expect(service.getHealth()).toEqual({
      status: 'error',
      database: 'disconnected',
      timestamp: expect.any(String),
    });
  });
});
