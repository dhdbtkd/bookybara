import { Suspense } from "react";
import { isAdminAuthenticated, signedInEmail } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";
import AdminLogin from "./admin-login";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuth = await isAdminAuthenticated();
  if (isAuth) {
    return (
      <Suspense>
        <AdminDashboard />
      </Suspense>
    );
  }

  // 구글로는 들어왔는데 관리자 목록에 없는 경우를 로그인 화면에서 설명해준다.
  const signedInAs = await signedInEmail();
  return (
    <Suspense>
      <AdminLogin signedInAs={signedInAs} />
    </Suspense>
  );
}
