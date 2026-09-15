import type { Metadata } from "next";

// 관리자 화면은 색인하지 않는다. robots.txt 로도 막지만 메타로 한 번 더 명시한다.
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
