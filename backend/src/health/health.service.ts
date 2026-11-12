import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  getHealth(): HealthStatus {
    const connected = this.connection.readyState === 1;

    return {
      status: connected ? 'ok' : 'error',
      database: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
