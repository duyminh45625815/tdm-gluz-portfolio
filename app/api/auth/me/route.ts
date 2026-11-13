import {
  authJson,
  clearAdminSessionCookie,
  getAdminSession,
} from "@/lib/auth/server";

export async function GET() {
  const session = await getAdminSession();

  if (session.status === "missing") {
    return authJson({ message: "Authentication required." }, 401);
  }
  if (session.status === "invalid") {
    const response = authJson({ message: "Authentication required." }, 401);
    clearAdminSessionCookie(response);
    return response;
  }
  if (session.status === "unavailable") {
    return authJson(
      { message: "Authentication service is unavailable." },
      503,
    );
  }

  return authJson({ admin: session.admin });
}
