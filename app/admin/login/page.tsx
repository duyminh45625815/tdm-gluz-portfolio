import { getAdminSession } from "@/lib/auth/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ExpiredSessionRedirect from "../ExpiredSessionRedirect";
import LoginForm from "./LoginForm";

export const instant = false;

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session.status === "authenticated") {
    redirect("/admin");
  }
  if (session.status === "invalid") {
    return <ExpiredSessionRedirect />;
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <Link className="admin-login-brand" href="/" aria-label="TDM GLUZ home">
          TDM GLUZ<span>.</span>
        </Link>
        <p className="admin-eyebrow">Portfolio CMS</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        {session.status === "unavailable" ? (
          <p className="admin-login-error" role="alert">
            Authentication is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <LoginForm />
        )}
      </section>
    </main>
  );
}
