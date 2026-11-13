import {
  authJson,
  clearAdminSessionCookie,
  isSameOriginRequest,
} from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return authJson({ message: "Request origin is not allowed." }, 403);
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
  clearAdminSessionCookie(response);
  return response;
}
