import {
  authJson,
  clearAdminSessionCookie,
  isSameOriginRequest,
} from "@/lib/auth/server";
import { NextResponse } from "next/server";

export function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return authJson({ message: "Request origin is not allowed." }, 403);
  }

  const response = NextResponse.redirect(
    new URL("/admin/login", request.url),
    303,
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  clearAdminSessionCookie(response);
  return response;
}
