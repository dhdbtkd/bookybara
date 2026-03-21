import { Suspense } from "react";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";
import AdminLogin from "./admin-login";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuth = await isAdminAuthenticated();
  return isAuth ? (
    <Suspense>
      <AdminDashboard />
    </Suspense>
  ) : (
    <AdminLogin />
  );
}
