"use client";

export async function adminApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, { ...init, cache: "no-store" });
  if (response.status === 401) {
    window.dispatchEvent(new Event("admin-session-expired"));
  }
  return response;
}
