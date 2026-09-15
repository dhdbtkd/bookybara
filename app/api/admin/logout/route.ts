import { COOKIE_NAME } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  // 구글 로그인 세션도 같이 끊는다. 하나만 끊으면 로그아웃한 것처럼 보이지 않는다.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}
  return NextResponse.json({ ok: true });
}
