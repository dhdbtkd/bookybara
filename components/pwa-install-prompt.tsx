"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Zap, Bell, WifiOff, ArrowUpFromLine, Smartphone } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "pwa-install": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        "manifest-url"?: string;
        "install-description"?: string;
        "icon"?: string;
        "name"?: string;
        "description"?: string;
        "manual-chrome"?: boolean | string;
        "manual-apple"?: boolean | string;
      }, HTMLElement>;
    }
  }
}

const DISMISSED_KEY = "pwa_prompt_dismissed_until";
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

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

function isMobile(ua: string) {
  return /android|iphone|ipad|ipod/i.test(ua);
}

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [env, setEnv] = useState<Env>(null);

  useEffect(() => {
    import("@khmyznikov/pwa-install").catch(() => {});
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // PWA로 이미 실행 중이면 스킵
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // 이미 닫은 적 있으면 스킵
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const ua = navigator.userAgent;
    if (!isMobile(ua)) return;

    const detected = detectEnv(ua);
    setEnv(detected);
    setShow(true);
  }, []);

  const handleInstall = () => {
    const el = document.querySelector("pwa-install") as any;
    el?.showDialog(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + ONE_MONTH_MS));
    setShow(false);
  };

  const isIosSafari = env === "ios-safari";
  const isIosOther = env === "ios-other";

  return (
    <>
      {/* 라이브러리 엘리먼트 - 숨김, 이벤트 캡처 전용 */}
      <pwa-install
        manifest-url="/manifest.webmanifest"
        icon="/menifest.png"
        name="책피바라"
        description="우리들의 독서모임"
        install-description="홈 화면에 추가하면 앱처럼 바로 열 수 있어요"
        manual-chrome
        manual-apple
      />

      {/* 커스텀 바텀시트 */}
      <AnimatePresence>
        {show && (
          <>
            <motion.div
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[101] bg-[#FAFAF8] rounded-t-3xl px-6 pt-3 pb-10 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              {/* Handle bar */}
              <div className="mx-auto w-10 h-1 rounded-full bg-[#D0C8BC] mb-5" />

              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#F0EAE0] flex items-center justify-center flex-shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/menifest.png" alt="책피바라" className="w-12 h-12 object-contain rounded-xl" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-lg font-semibold text-[#1C1A17] leading-snug">책피바라를 앱으로</p>
                  <p className="text-sm text-[#6B6560] mt-0.5">
                    {isIosSafari && "홈 화면에서 바로 책피바라를 열어보세요"}
                    {isIosOther && "Safari에서 홈 화면에 추가할 수 있어요"}
                    {env === "android" && "더 편리한 독서 경험을 시작하세요"}
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-[#9B948D] hover:text-[#1C1A17] transition-colors mt-1"
                  aria-label="닫기"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: Zap, label: "빠른 접속" },
                  { icon: Bell, label: "실시간 알림" },
                  { icon: WifiOff, label: "오프라인" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2 bg-[#EEF4EE] rounded-2xl py-4">
                    <div className="w-10 h-10 rounded-full bg-[#5A8A5A] flex items-center justify-center">
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-xs text-[#3A5A3A] font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {/* Hint */}
              {isIosSafari && (
                <p className="text-center text-xs text-[#9B948D] mb-4">
                  하단{" "}
                  <span className="inline-flex items-center gap-0.5 text-[#5A8A5A] font-medium">
                    <ArrowUpFromLine size={12} />공유
                  </span>{" "}
                  버튼 → <span className="font-medium text-[#1C1A17]">홈 화면에 추가</span>를 탭하세요
                </p>
              )}
              {isIosOther && (
                <p className="text-center text-xs text-[#9B948D] mb-4">
                  iPhone에서는 <span className="font-medium text-[#1C1A17]">Safari 브라우저</span>로 열어야 홈 화면에 추가할 수 있어요
                </p>
              )}
              {env === "android" && (
                <p className="text-center text-xs text-[#9B948D] mb-4">3초 만에 간편 추가, 언제든 삭제 가능</p>
              )}

              {/* CTA */}
              <button
                onClick={isIosSafari ? undefined : handleInstall}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-base transition-opacity ${
                  isIosSafari
                    ? "bg-[#D0C8BC] text-[#9B948D] cursor-default"
                    : "bg-[#1C1A17] text-white active:opacity-80"
                }`}
              >
                {isIosOther ? <Smartphone size={18} /> : <ArrowUpFromLine size={18} />}
                {isIosSafari && "홈 화면에 추가하기"}
                {isIosOther && "Safari로 열기"}
                {env === "android" && "홈 화면에 추가하기"}
              </button>

              <button
                onClick={handleDismiss}
                className="w-full mt-3 py-2 text-sm text-[#9B948D] hover:text-[#1C1A17] transition-colors"
              >
                나중에 할게요
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
