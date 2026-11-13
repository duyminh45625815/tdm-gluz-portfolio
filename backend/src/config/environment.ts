const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function requiredString(
  environment: Record<string, unknown>,
  name: string,
): string {
  const value = environment[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

function parseInteger(
  value: unknown,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed =
    value === undefined || value === ''
      ? fallback
      : typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : Number.NaN;

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }

  return parsed;
}

function parseAllowedOrigins(
  rawOrigins: unknown,
  isProduction: boolean,
): string[] {
  if (rawOrigins === undefined || rawOrigins === '') {
    if (isProduction) {
      throw new Error(
        'CORS_ALLOWED_ORIGINS must be configured in production.',
      );
    }

    return DEFAULT_LOCAL_ORIGINS;
  }

  if (typeof rawOrigins !== 'string') {
    throw new Error('CORS_ALLOWED_ORIGINS must be a comma-separated origin list.');
  }

  const origins = rawOrigins.split(',').map((origin) => origin.trim());

  if (
    origins.length === 0 ||
    origins.some((origin) => !isValidOrigin(origin))
  ) {
    throw new Error('CORS_ALLOWED_ORIGINS must contain valid HTTP(S) origins.');
  }

  return [...new Set(origins)];
}

function isValidOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.origin === origin &&
      parsed.username.length === 0 &&
      parsed.password.length === 0
    );
  } catch {
    return false;
  }
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnvironment =
    typeof environment.NODE_ENV === 'string'
      ? environment.NODE_ENV
      : 'development';

  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const mongoUri = requiredString(environment, 'MONGODB_URI');
  try {
    const parsedMongoUri = new URL(mongoUri);
    if (
      !['mongodb:', 'mongodb+srv:'].includes(parsedMongoUri.protocol) ||
      parsedMongoUri.hostname.length === 0
    ) {
      throw new Error();
    }
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI.');
  }

  const jwtSecret = requiredString(environment, 'JWT_SECRET');
  if (jwtSecret.trim().length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }

  return {
    ...environment,
    NODE_ENV: nodeEnvironment,
    PORT: parseInteger(environment.PORT, 'PORT', 3000, 1, 65535),
    LOGIN_RATE_LIMIT_MAX: parseInteger(
      environment.LOGIN_RATE_LIMIT_MAX,
      'LOGIN_RATE_LIMIT_MAX',
      5,
      1,
      100,
    ),
    LOGIN_RATE_LIMIT_TTL_MS: parseInteger(
      environment.LOGIN_RATE_LIMIT_TTL_MS,
      'LOGIN_RATE_LIMIT_TTL_MS',
      60_000,
      1,
      3_600_000,
    ),
    CORS_ALLOWED_ORIGINS: parseAllowedOrigins(
      environment.CORS_ALLOWED_ORIGINS,
      nodeEnvironment === 'production',
    ),
  };
}
