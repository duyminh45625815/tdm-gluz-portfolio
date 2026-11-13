import { getAdminSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AdminShell from "../AdminShell";
import ExpiredSessionRedirect from "../ExpiredSessionRedirect";

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
    <AdminShell admin={session.admin} expiresAt={session.expiresAt}>
      {children}
    </AdminShell>
  );
}
