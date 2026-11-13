export const ARGON2ID_HASH_PATTERN =
  /^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isArgon2idHash(value: string | undefined): value is string {
  return value !== undefined && ARGON2ID_HASH_PATTERN.test(value);
}
