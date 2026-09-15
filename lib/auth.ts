import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24시간

/**
 * 세션 쿠키는 서명한다.
 * 예전엔 값이 "authenticated" 라는 고정 문자열이라, 개발자도구에서 쿠키만 그대로
 * 만들어 넣으면 비밀번호 없이 관리자가 됐다. 이제 만료시각 + HMAC 이라 위조할 수 없다.
 */
function adminPassword(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) {
    // 예전 기본값("admin1234")을 두면 환경변수를 빠뜨린 배포가 조용히 열린 채로 뜬다.
    throw new Error("ADMIN_PASSWORD가 설정되지 않았습니다.");
  }
  return value;
}

function sessionSecret(): string {
  // 별도 시크릿이 있으면 그걸 쓰고, 없으면 비밀번호를 키로 삼는다.
  // 비밀번호를 바꾸면 기존 세션이 모두 끊기는 게 오히려 바람직하다.
  return process.env.ADMIN_SESSION_SECRET || adminPassword();
}

function sign(expiresAt: number): string {
  return createHmac("sha256", sessionSecret()).update(String(expiresAt)).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const [expiresRaw, signature] = value.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  if (!signature) return false;
  try {
    return safeEqual(signature, sign(expiresAt));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionValue(cookieStore.get(COOKIE_NAME)?.value);
}

export function checkAdminPassword(password: unknown): boolean {
  if (typeof password !== "string" || password.length === 0) return false;
  try {
    return safeEqual(password, adminPassword());
  } catch {
    return false;
  }
}

export { COOKIE_NAME, SESSION_TTL_MS };
