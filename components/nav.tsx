"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "홈" },
  { href: "/meetings", label: "일정" },
  { href: "/reviews", label: "독후감" },
  { href: "/candidates", label: "도서 리스트" },
  { href: "/discussion", label: "토론 질문" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-[#F0EAE0] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14 gap-2">
        <Link
          href="/"
          className="text-lg tracking-tight text-[#1C1A17] flex-shrink-0"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
        >
          독서모임
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mr-2 pr-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? "bg-[#1C1A17] text-white"
                  : "text-[#5C5348] hover:bg-[#E5DDD0] cursor-pointer"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-0.5 px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap text-[#8B3A2A]/60 hover:text-[#8B3A2A] transition-colors cursor-pointer"
          >
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}
