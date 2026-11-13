import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "tdm_admin_session";

function redirect(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (isLoginPage && hasSessionCookie) {
    return redirect(request, "/admin");
  }
  if (!isLoginPage && !hasSessionCookie) {
    return redirect(request, "/admin/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
