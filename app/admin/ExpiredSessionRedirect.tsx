"use client";

import { useEffect, useState } from "react";

async function clearExpiredSession() {
  const response = await fetch("/api/auth/expired", {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to clear the expired session.");
  }

  window.location.replace("/admin/login");
}

export default function ExpiredSessionRedirect() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    void clearExpiredSession().catch(() => {
      if (active) {
        setHasError(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="admin-status-page">
      <section className="admin-login-card">
        <p role={hasError ? "alert" : "status"}>
          {hasError
            ? "We couldn’t clear your expired session. Please try again."
            : "Your session expired. Signing you out..."}
        </p>
        {hasError && (
          <div className="admin-login-form">
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                void clearExpiredSession().catch(() => setHasError(true));
              }}
            >
              Try again
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
