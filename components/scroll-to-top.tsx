"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

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
      className="fixed bottom-6 right-4 z-50 p-2.5 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-lg text-neutral-500 hover:text-neutral-800 hover:bg-white transition-all cursor-pointer"
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      aria-label="맨 위로"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
