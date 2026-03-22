"use client";

import { useEffect, useState } from "react";
import { ArrowUpFromLine } from "lucide-react";

export default function HomeInstallBanner() {
  const [isPwa, setIsPwa] = useState(true); // 마운트 전엔 숨김

  useEffect(() => {
    setIsPwa(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (isPwa) return null;

  const handleClick = () => {
    const el = document.querySelector("pwa-install") as any;
    el?.showDialog(true); // pwa-install 라이브러리의 네이티브 다이얼로그 트리거
  };

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
        앱으로 사용하기
      </h2>

      <div className="rounded-2xl bg-[#1C1A17] px-5 py-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#F0EAE0] flex items-center justify-center flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/menifest.png" alt="책피바라" className="w-8 h-8 object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">홈 화면에 추가하기</p>
          <p className="text-xs text-[#9B948D] mt-0.5">3초 만에 간편 설치, 언제든 삭제 가능</p>
        </div>

        <button
          onClick={handleClick}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#F0EAE0] text-[#1C1A17] text-xs font-semibold px-3.5 py-2 rounded-xl active:opacity-70 transition-opacity whitespace-nowrap"
        >
          <ArrowUpFromLine size={14} />
          추가하기
        </button>
      </div>
    </section>
  );
}
