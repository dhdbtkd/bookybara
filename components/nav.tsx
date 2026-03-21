"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "홈" },
  { href: "/meetings", label: "일정" },
  { href: "/reviews", label: "독후감" },
  { href: "/candidates", label: "도서 리스트" },
  { href: "/discussion", label: "토론 질문" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 라우트 변경 시 닫기
  useEffect(() => { setOpen(false); }, [pathname]);

  // 패널 열릴 때 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="border-b bg-[#F0EAE0] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14 gap-2">
          <Link
            href="/"
            className="text-lg tracking-tight text-[#1C1A17] flex-shrink-0"
            style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
          >
            독서모임
          </Link>

          {/* 데스크탑 메뉴 */}
          <nav className="hidden sm:flex items-center gap-0.5 -mr-2 pr-2">
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

          {/* 모바일 햄버거 버튼 */}
          <button
            className="sm:hidden p-2 -mr-1 text-[#1C1A17] cursor-pointer"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 모바일 사이드 패널 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 배경 오버레이 */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            {/* 사이드 패널 */}
            <motion.div
              className="fixed top-0 right-0 z-50 h-full w-64 bg-[#1C1A17] flex flex-col sm:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {/* 패널 헤더 */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/10 flex-shrink-0">
                <span
                  className="text-white text-base"
                  style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
                >
                  독서모임
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 메뉴 링크 */}
              <nav className="flex flex-col p-3 gap-0.5 flex-1">
                {links.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.2 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        pathname === link.href
                          ? "bg-[#8B3A2A] text-white"
                          : "text-white/60 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* 관리자 링크 */}
              <div className="p-3 border-t border-white/10">
                <Link
                  href="/admin"
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#8B3A2A]/60 hover:text-[#8B3A2A] transition-colors"
                >
                  관리자
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
