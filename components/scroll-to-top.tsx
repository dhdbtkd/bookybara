"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  // 관리자 모바일 화면엔 하단 탭 바가 있다. 그 위로 올려서 마지막 탭을 가리지 않게 한다.
  const aboveTabBar = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 z-50 p-2.5 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-lg text-stone-700 hover:text-ink hover:bg-white cursor-pointer tap",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150",
        aboveTabBar
          ? "bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      )}
      aria-label="맨 위로"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
