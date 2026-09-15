import { checkAdminPassword, COOKIE_NAME, SESSION_TTL_MS, createSessionValue } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// 4자리 비밀번호는 만 번이면 다 넣어본다. 인스턴스별이라 완벽하진 않지만,
// 자동화된 대입을 사람이 못 느낄 만큼 느리게 만드는 것만으로도 값이 있다.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (tooManyAttempts(ip)) {
    return NextResponse.json({ error: "시도가 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    // 비밀번호가 안 틀린 게 아니라 서버에 설정이 없는 것이다. 둘을 섞어 보여주지 않는다.
    return NextResponse.json(
      { error: "서버에 ADMIN_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { password } = await req.json();

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
