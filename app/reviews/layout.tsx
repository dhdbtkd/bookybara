import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  // 문자열로 두면 하위 세그먼트가 루트의 꼬리표를 잃는다. 여기서 이어 붙인다.
  title: { default: "독후감", template: `%s · ${siteName}` },
  description: "책피바라 멤버들이 모임마다 남긴 독후감을 모았습니다.",
  alternates: { canonical: "/reviews" },
  // 멤버들이 쓴 글이라 검색 결과에 올리지 않는다. 목록·상세·작성 폼 모두 해당한다.
  // robots.txt 로 크롤까지 막으면 이 noindex 를 읽지 못해 URL 만 색인될 수 있다.
  robots: { index: false, follow: false },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
