import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const COOKIE_NAME = "admin_session";
const COOKIE_VALUE = "authenticated";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export { COOKIE_NAME, COOKIE_VALUE };
