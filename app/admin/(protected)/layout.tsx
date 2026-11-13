import { getAdminSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import ExpiredSessionRedirect from "../ExpiredSessionRedirect";
import LogoutButton from "../LogoutButton";

export const instant = false;

export default async function ProtectedAdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const session = await getAdminSession();

  if (session.status === "missing") {
    redirect("/admin/login");
  }
  if (session.status === "invalid") {
    return <ExpiredSessionRedirect />;
  }
  if (session.status === "unavailable") {
    return (
      <main className="admin-status-page">
        <p role="alert">
          We can&apos;t verify your session right now. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="admin-login-brand" href="/admin">
          TDM GLUZ<span>.</span> <small>ADMIN</small>
        </a>
        <div className="admin-account">
          <div>
            <span>{session.admin.email}</span>
            <small>{session.admin.role}</small>
          </div>
          <LogoutButton expiresAt={session.expiresAt} />
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  );
}
