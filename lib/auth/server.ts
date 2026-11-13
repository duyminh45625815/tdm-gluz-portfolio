import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "tdm_admin_session";
export const SESSION_MAX_AGE_SECONDS = 900;

export type AdminPublic = {
  id: string;
  email: string;
  role: "admin";
  isActive: true;
  lastLoginAt: string | null;
};

export type AdminSessionResult =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "unavailable" }
  | { status: "authenticated"; admin: AdminPublic; expiresAt: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getBackendAuthUrl(path: "login" | "me"): URL | null {
  const configuredUrl = process.env.BACKEND_API_URL;

  if (!configuredUrl) {
    return null;
  }

  try {
    const baseUrl = new URL(configuredUrl);
    if (
      !["http:", "https:"].includes(baseUrl.protocol) ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      return null;
    }

    const basePath = baseUrl.pathname.replace(/\/+$/, "");
    return new URL(`${basePath}/api/auth/${path}`, baseUrl.origin);
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      requestUrl.protocol.slice(0, -1);

    if (!host || !["http", "https"].includes(protocol)) {
      return false;
    }

    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

export function authJson(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function adminFrom(value: unknown): AdminPublic | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.email !== "string" ||
    value.role !== "admin" ||
    value.isActive !== true ||
    (value.lastLoginAt !== null && typeof value.lastLoginAt !== "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    email: value.email,
    role: "admin",
    isActive: true,
    lastLoginAt: value.lastLoginAt,
  };
}

function tokenExpiresAt(token: string): number | null {
  const payloadPart = token.split(".")[1];

  if (!payloadPart) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    );
    if (!isRecord(payload) || typeof payload.exp !== "number") {
      return null;
    }

    const expiresAt = payload.exp * 1000;
    return Number.isSafeInteger(expiresAt) ? expiresAt : null;
  } catch {
    return null;
  }
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminSessionResult> {
  const backendUrl = getBackendAuthUrl("me");

  if (!backendUrl) {
    return { status: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetch(backendUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    return { status: "unavailable" };
  }

  if (response.status === 401) {
    return { status: "invalid" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: "unavailable" };
  }

  const admin = adminFrom(payload);
  const expiresAt = tokenExpiresAt(token);
  if (!admin || expiresAt === null) {
    return { status: "invalid" };
  }

  return { status: "authenticated", admin, expiresAt };
}

export async function getAdminSession(): Promise<AdminSessionResult> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? verifyAdminToken(token) : { status: "missing" };
}

export function setAdminSessionCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
