import "server-only";

import { NextResponse } from "next/server";
import {
  authJson,
  clearAdminSessionCookie,
  getAdminApiSession,
  getBackendApiUrl,
  isSameOriginRequest,
} from "@/lib/auth/server";

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]+$/;
const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function errorResponse(status: number): NextResponse {
  const messages: Record<number, string> = {
    400: "Please review the submitted information.",
    403: "You do not have permission to perform this action.",
    404: "The requested content was not found.",
    409: "The request conflicts with existing content.",
  };

  return authJson(
    { message: messages[status] ?? "The request could not be completed." },
    status >= 500 ? 502 : status,
  );
}

function expiredSessionResponse(): NextResponse {
  const response = authJson({ message: "Your session has expired." }, 401);
  clearAdminSessionCookie(response);
  return response;
}

export async function proxyAdminApi(
  request: Request,
  pathSegments: string[],
): Promise<NextResponse> {
  const method = request.method.toUpperCase();
  if (MUTATING_METHODS.has(method) && !isSameOriginRequest(request)) {
    return authJson({ message: "Invalid request origin." }, 403);
  }

  if (
    pathSegments.length === 0 ||
    pathSegments.some((segment) => !SAFE_PATH_SEGMENT.test(segment))
  ) {
    return authJson({ message: "Invalid admin API path." }, 400);
  }

  const session = await getAdminApiSession();
  if (session.status === "missing") {
    return authJson({ message: "Authentication is required." }, 401);
  }
  if (session.status === "invalid") {
    return expiredSessionResponse();
  }
  if (session.status === "unavailable") {
    return authJson({ message: "The authentication service is unavailable." }, 503);
  }

  const backendUrl = getBackendApiUrl(
    `/api/admin/${pathSegments.map(encodeURIComponent).join("/")}`,
  );
  if (!backendUrl) {
    return authJson({ message: "The admin service is not configured." }, 503);
  }
  backendUrl.search = new URL(request.url).search;

  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${session.accessToken}`,
  });
  let body: string | undefined;
  if (MUTATING_METHODS.has(method)) {
    body = await request.text();
    headers.set("Content-Type", "application/json");
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    return authJson({ message: "The admin service is unavailable." }, 502);
  }

  if (backendResponse.status === 401) {
    return expiredSessionResponse();
  }
  if (!backendResponse.ok) {
    return errorResponse(backendResponse.status);
  }
  if (backendResponse.status === 204) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  const contentType = backendResponse.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return authJson({ message: "The admin service returned an invalid response." }, 502);
  }

  const responseBody = await backendResponse.text();
  return new NextResponse(responseBody || null, {
    status: backendResponse.status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
