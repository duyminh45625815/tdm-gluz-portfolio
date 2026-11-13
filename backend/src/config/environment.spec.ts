import { validateEnvironment } from './environment.js';

const VALID_ENVIRONMENT = {
  NODE_ENV: 'test',
  MONGODB_URI: ['mongodb:', '', '127.0.0.1:27017', 'portfolio_test'].join('/'),
  JWT_SECRET: 'test-only-secret-that-is-at-least-thirty-two-characters',
};

describe('validateEnvironment', () => {
  it('uses safe defaults for port, local origins, and login throttling', () => {
    expect(validateEnvironment(VALID_ENVIRONMENT)).toMatchObject({
      PORT: 3000,
      LOGIN_RATE_LIMIT_MAX: 5,
      LOGIN_RATE_LIMIT_TTL_MS: 60_000,
      CORS_ALLOWED_ORIGINS: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ],
    });
  });

  it('rejects missing database and JWT configuration without echoing values', () => {
    expect(() =>
      validateEnvironment({
        JWT_SECRET: VALID_ENVIRONMENT.JWT_SECRET,
      }),
    ).toThrow('MONGODB_URI must be configured.');

    expect(() =>
      validateEnvironment({
        MONGODB_URI: VALID_ENVIRONMENT.MONGODB_URI,
      }),
    ).toThrow('JWT_SECRET must be configured.');
  });

  it('rejects short JWT secrets without exposing the supplied value', () => {
    const shortSecret = 'do-not-echo-this-secret';
    let errorMessage = '';

    try {
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        JWT_SECRET: shortSecret,
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : '';
    }

    expect(errorMessage).toContain(
      'JWT_SECRET must be configured with at least 32 characters.',
    );
    expect(errorMessage).not.toContain(shortSecret);
  });

  it('rejects malformed configuration and requires production CORS origins', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        MONGODB_URI: 'not-a-mongodb-uri',
      }),
    ).toThrow('MONGODB_URI must be a valid MongoDB connection URI.');

    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        PORT: '65536',
      }),
    ).toThrow('PORT must be an integer');

    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
      }),
    ).toThrow('CORS_ALLOWED_ORIGINS must be configured in production.');
  });

  it('accepts explicit validated throttle and production CORS settings', () => {
    expect(
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://cms.example.test',
        LOGIN_RATE_LIMIT_MAX: '7',
        LOGIN_RATE_LIMIT_TTL_MS: '90000',
        PORT: '8080',
      }),
    ).toMatchObject({
      PORT: 8080,
      LOGIN_RATE_LIMIT_MAX: 7,
      LOGIN_RATE_LIMIT_TTL_MS: 90_000,
      CORS_ALLOWED_ORIGINS: ['https://cms.example.test'],
    });
  });
});
