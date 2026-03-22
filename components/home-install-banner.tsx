"use client";

import { useEffect, useState } from "react";
import { ArrowUpFromLine, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Env = "ios-safari" | "ios-other" | "android" | null;

function detectEnv(ua: string): Env {
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (isIos) {
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edgios|opios/i.test(ua);
    return isSafari ? "ios-safari" : "ios-other";
  }
  if (/android/i.test(ua)) return "android";
  return null;
}

export default function HomeInstallBanner() {
  const [env, setEnv] = useState<Env>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const detected = detectEnv(navigator.userAgent);
    setEnv(detected);

    if (detected === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (env === "ios-other") {
      window.location.href = `safari://${window.location.host}${window.location.pathname}`;
      return;
    }
    if (env === "android" && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // PWA로 이미 실행 중이거나 지원 환경 아님
  if (installed || !env) return null;

  const isIosSafari = env === "ios-safari";
  const isIosOther = env === "ios-other";

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
        앱으로 사용하기
      </h2>

      <div className="rounded-2xl bg-[#1C1A17] px-5 py-5 flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#F0EAE0] flex items-center justify-center flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="책피바라" className="w-8 h-8 object-contain" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">
            {isIosSafari && "홈 화면에 추가하기"}
            {isIosOther && "Safari에서 설치하기"}
            {env === "android" && "홈 화면에 추가하기"}
          </p>
          <p className="text-xs text-[#9B948D] mt-0.5 leading-snug">
            {isIosSafari && (
              <>
                하단{" "}
                <span className="inline-flex items-center gap-0.5 text-[#C8956C]">
                  <ArrowUpFromLine size={11} />
                  공유
                </span>{" "}
                → 홈 화면에 추가
              </>
            )}
            {isIosOther && "iPhone에서는 Safari 브라우저로 설치할 수 있어요"}
            {env === "android" && "3초 만에 간편 설치, 언제든 삭제 가능"}
          </p>
        </div>

        {/* CTA */}
        {!isIosSafari && (
          <button
            onClick={handleInstall}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#F0EAE0] text-[#1C1A17] text-xs font-semibold px-3.5 py-2 rounded-xl active:opacity-70 transition-opacity whitespace-nowrap"
          >
            {isIosOther ? <Smartphone size={14} /> : <ArrowUpFromLine size={14} />}
            {isIosOther ? "Safari로 열기" : "추가하기"}
          </button>
        )}
      </div>
    </section>
  );
}
