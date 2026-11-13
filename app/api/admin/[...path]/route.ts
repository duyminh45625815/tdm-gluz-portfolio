import { proxyAdminApi } from "@/lib/admin-api/server";

type AdminRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handleAdminRequest(
  request: Request,
  context: AdminRouteContext,
) {
  const { path } = await context.params;
  return proxyAdminApi(request, path);
}

export const GET = handleAdminRequest;
export const POST = handleAdminRequest;
export const PATCH = handleAdminRequest;
export const PUT = handleAdminRequest;
export const DELETE = handleAdminRequest;
