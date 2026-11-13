import { HttpStatus, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';

function createRequestContext(ip: string) {
  const headers = new Map<string, string | number>();
  const response = {
    setHeader: vi.fn((name: string, value: string | number) => {
      headers.set(name, value);
    }),
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
      getResponse: () => response,
    }),
  } as ExecutionContext;

  return { context, headers };
}

describe('LoginRateLimitGuard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('limits each client IP and returns the configured 429 response', () => {
    const guard = new LoginRateLimitGuard(
      new ConfigService({
        LOGIN_RATE_LIMIT_MAX: 2,
        LOGIN_RATE_LIMIT_TTL_MS: 60_000,
      }),
    );
    const { context, headers } = createRequestContext('192.0.2.1');

    expect(guard.canActivate(context)).toBe(true);
    expect(headers.get('X-RateLimit-Limit')).toBe(2);
    expect(headers.get('X-RateLimit-Remaining')).toBe(1);
    expect(guard.canActivate(context)).toBe(true);
    expect(headers.get('X-RateLimit-Remaining')).toBe(0);

    try {
      guard.canActivate(context);
      throw new Error('Expected the login rate limit to reject the request.');
    } catch (error) {
      expect(error).toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
        response: 'Too many login attempts. Please try again later.',
      });
    }
    expect(headers.get('Retry-After')).toBe(60);

    const otherClient = createRequestContext('192.0.2.2');
    expect(guard.canActivate(otherClient.context)).toBe(true);
  });

  it('allows requests again after the configured block duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const guard = new LoginRateLimitGuard(
      new ConfigService({
        LOGIN_RATE_LIMIT_MAX: 1,
        LOGIN_RATE_LIMIT_TTL_MS: 1_000,
      }),
    );
    const { context } = createRequestContext('192.0.2.1');

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(
      'Too many login attempts. Please try again later.',
    );

    vi.advanceTimersByTime(1_000);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('groups IPv6 addresses from the same /64 subnet', () => {
    const guard = new LoginRateLimitGuard(
      new ConfigService({
        LOGIN_RATE_LIMIT_MAX: 1,
        LOGIN_RATE_LIMIT_TTL_MS: 60_000,
      }),
    );

    expect(
      guard.canActivate(createRequestContext('2001:db8:1:2::1').context),
    ).toBe(true);
    expect(() =>
      guard.canActivate(createRequestContext('2001:0db8:0001:0002::2').context),
    ).toThrow('Too many login attempts. Please try again later.');
  });
});
