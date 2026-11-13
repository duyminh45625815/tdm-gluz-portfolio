"use client";

import { useEffect, useState } from "react";

export default function LogoutButton({ expiresAt }: { expiresAt: number }) {
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      })
        .catch(() => undefined)
        .finally(() => window.location.replace("/admin/login"));
    }, Math.max(0, expiresAt - Date.now()));

    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  async function logout() {
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to sign out. Please try again.");
        return;
      }

      window.location.replace("/admin/login");
    } catch {
      setError("Unable to sign out. Please try again.");
    }
  }

  return (
    <div className="admin-logout">
      <button type="button" onClick={logout}>
        Sign out
      </button>
      {error && (
        <span className="admin-logout-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
