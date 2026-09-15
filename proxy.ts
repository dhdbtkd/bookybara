import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

// Next 16 부터 미들웨어의 이름이 proxy 다. 하는 일은 같다.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 관리자 화면과 로그인 콜백에서만 세션을 갱신한다. 공개 페이지는 건드리지 않는다.
  matcher: ["/admin/:path*", "/admin", "/auth/:path*"],
};
