import type { Metadata } from "next";

// 작성 폼은 검색 결과에 있을 이유가 없다.
export const metadata: Metadata = {
  title: "독후감 쓰기",
  alternates: { canonical: "/reviews/new" },
  robots: { index: false, follow: false },
};

export default function NewReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
