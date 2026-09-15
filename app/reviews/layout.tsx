import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  // 문자열로 두면 하위 세그먼트가 루트의 꼬리표를 잃는다. 여기서 이어 붙인다.
  title: { default: "독후감", template: `%s · ${siteName}` },
  description: "책피바라 멤버들이 모임마다 남긴 독후감을 모았습니다.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
