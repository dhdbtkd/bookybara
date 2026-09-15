/**
 * 사이트의 정식 주소 한 곳.
 * 커스텀 도메인으로 옮길 땐 NEXT_PUBLIC_SITE_URL 만 바꾸면 robots·sitemap·OG 가 모두 따라온다.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel 이 주는 '프로덕션' 도메인. 프리뷰 배포에서도 프로덕션 주소를 가리킨다.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  // 시스템 환경변수가 없는 상황에서도 프로덕션이 localhost 를 canonical 로 뱉지 않게 한다.
  if (process.env.NODE_ENV === "production") return "https://bookybara.vercel.app";
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();

export const siteName = "책피바라";
export const siteDescription = "독서모임 책피바라의 모임 일정과 멤버들이 쓴 독후감을 모아둔 공간입니다.";
