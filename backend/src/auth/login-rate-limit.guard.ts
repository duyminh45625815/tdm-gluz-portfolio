import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP } from 'node:net';
import type { Request, Response } from 'express';

const ERROR_MESSAGE = 'Too many login attempts. Please try again later.';
const CLEANUP_INTERVAL_MS = 60_000;

interface LoginRateLimitState {
  timestamps: number[];
  blockedUntil?: number;
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly limit: number;
  private readonly ttl: number;
  private readonly requests = new Map<string, LoginRateLimitState>();
  private nextCleanupAt = 0;

  constructor(configService: ConfigService) {
    this.limit = configService.getOrThrow<number>('LOGIN_RATE_LIMIT_MAX');
    this.ttl = configService.getOrThrow<number>('LOGIN_RATE_LIMIT_TTL_MS');
  }

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    if (now >= this.nextCleanupAt) {
      this.cleanupExpiredRequests(now);
      this.nextCleanupAt = now + CLEANUP_INTERVAL_MS;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const key = normalizeClientIp(
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
    let state = this.requests.get(key);

    if (state?.blockedUntil !== undefined) {
      if (state.blockedUntil > now) {
        response.setHeader(
          'Retry-After',
          Math.ceil((state.blockedUntil - now) / 1000),
        );
        throw new HttpException(ERROR_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
      }

      state = undefined;
    }

    const timestamps = (state?.timestamps ?? []).filter(
      (timestamp) => timestamp + this.ttl > now,
    );

    if (timestamps.length >= this.limit) {
      this.requests.set(key, { timestamps, blockedUntil: now + this.ttl });
      response.setHeader('Retry-After', Math.ceil(this.ttl / 1000));
      throw new HttpException(ERROR_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    timestamps.push(now);
    this.requests.set(key, { timestamps });

    response.setHeader('X-RateLimit-Limit', this.limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.limit - timestamps.length),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil((timestamps[0] + this.ttl - now) / 1000),
    );

    return true;
  }

  onModuleDestroy(): void {
    this.requests.clear();
  }

  private cleanupExpiredRequests(now: number): void {
    for (const [key, state] of this.requests) {
      if (state.blockedUntil !== undefined && state.blockedUntil <= now) {
        this.requests.delete(key);
        continue;
      }

      state.timestamps = state.timestamps.filter(
        (timestamp) => timestamp + this.ttl > now,
      );
      if (state.timestamps.length === 0) {
        this.requests.delete(key);
      }
    }

  }
}

function normalizeClientIp(ip: string): string {
  const zoneIndex = ip.indexOf('%');
  const address = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);
  if (isIP(address) === 4) {
    return address;
  }
  if (isIP(address) !== 6) {
    return ip;
  }

  let normalizedAddress = address.toLowerCase();
  const lastColon = normalizedAddress.lastIndexOf(':');
  const tail = normalizedAddress.slice(lastColon + 1);
  if (tail.includes('.')) {
    const octets = tail.split('.').map(Number);
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    normalizedAddress = `${normalizedAddress.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const [left = '', right = ''] = normalizedAddress.split('::');
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  const fillCount = 8 - leftGroups.length - rightGroups.length;
  const groups =
    fillCount > 0
      ? [...leftGroups, ...Array<string>(fillCount).fill('0'), ...rightGroups]
      : leftGroups;
  const hextets = groups.map((group) => Number.parseInt(group, 16));

  if (hextets[7] === 1 && hextets.slice(0, 7).every((hextet) => hextet === 0)) {
    return '::1';
  }

  if (
    hextets.slice(0, 5).every((hextet) => hextet === 0) &&
    hextets[5] === 0xffff
  ) {
    return [
      hextets[6] >> 8,
      hextets[6] & 0xff,
      hextets[7] >> 8,
      hextets[7] & 0xff,
    ].join('.');
  }

  return `${hextets.slice(0, 4).map((hextet) => hextet.toString(16)).join(':')}/64`;
}
