import {
  authJson,
  getBackendAuthUrl,
  isSameOriginRequest,
  setAdminSessionCookie,
} from "@/lib/auth/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return authJson({ message: "Request origin is not allowed." }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authJson({ message: "Enter a valid email and password." }, 400);
  }

  if (
    !isRecord(body) ||
    typeof body.email !== "string" ||
    body.email.length === 0 ||
    body.email.length > 254 ||
    typeof body.password !== "string" ||
    body.password.length === 0 ||
    body.password.length > 1024
  ) {
    return authJson({ message: "Enter a valid email and password." }, 400);
  }

  const backendUrl = getBackendAuthUrl("login");
  if (!backendUrl) {
    return authJson(
      { message: "Authentication service is unavailable." },
      503,
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    return authJson(
      { message: "Unable to sign in right now. Please try again." },
      502,
    );
  }

  if (backendResponse.status === 401) {
    return authJson({ message: "Invalid email or password." }, 401);
  }
  if (backendResponse.status === 400) {
    return authJson({ message: "Enter a valid email and password." }, 400);
  }
  if (backendResponse.status === 429) {
    return authJson(
      { message: "Too many sign-in attempts. Please try again later." },
      429,
    );
  }
  if (!backendResponse.ok) {
    return authJson(
      { message: "Unable to sign in right now. Please try again." },
      502,
    );
  }

  let backendBody: unknown;
  try {
    backendBody = await backendResponse.json();
  } catch {
    return authJson(
      { message: "Unable to sign in right now. Please try again." },
      502,
    );
  }

  if (
    !isRecord(backendBody) ||
    typeof backendBody.accessToken !== "string" ||
    backendBody.accessToken.length === 0 ||
    backendBody.tokenType !== "Bearer" ||
    typeof backendBody.expiresIn !== "number" ||
    !Number.isInteger(backendBody.expiresIn) ||
    backendBody.expiresIn <= 0 ||
    !isRecord(backendBody.admin) ||
    typeof backendBody.admin.id !== "string" ||
    typeof backendBody.admin.email !== "string" ||
    backendBody.admin.role !== "admin" ||
    backendBody.admin.isActive !== true ||
    (backendBody.admin.lastLoginAt !== null &&
      typeof backendBody.admin.lastLoginAt !== "string")
  ) {
    return authJson(
      { message: "Unable to sign in right now. Please try again." },
      502,
    );
  }

  const response = authJson(
    {
      admin: {
        id: backendBody.admin.id,
        email: backendBody.admin.email,
        role: "admin",
        isActive: true,
        lastLoginAt: backendBody.admin.lastLoginAt,
      },
    },
    200,
  );
  setAdminSessionCookie(response, backendBody.accessToken);
  return response;
}
