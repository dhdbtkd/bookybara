import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

// 구글에서 돌아오는 자리. 코드를 세션으로 바꾸고 원래 가려던 곳으로 보낸다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/admin";

  // 배포 환경은 프록시 뒤라 origin 이 내부 주소로 잡힌다. 전달된 호스트를 쓴다.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (!code) return NextResponse.redirect(`${base}/admin?error=missing_code`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${base}/admin?error=exchange_failed`);

  return NextResponse.redirect(`${base}${next}`);
}
