"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ArrowUpFromLine, SquareArrowOutUpRight } from "lucide-react";

const DISMISSED_KEY = "pwa_prompt_dismissed_until";
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// 환경별 설정
type Env = "ios-safari" | "ios-other" | "android" | null;

function detectEnv(ua: string): Env {
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (isIos) {
    // CriOS = Chrome on iOS, FxiOS = Firefox on iOS
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edgios|opios/i.test(ua);
    return isSafari ? "ios-safari" : "ios-other";
  }
  if (/android/i.test(ua)) return "android";
  return null;
}

const ENV_COPY: Record<
  Exclude<Env, null>,
  { subtitle: string; hint: React.ReactNode; ctaLabel: string; ctaDisabled?: boolean }
> = {
  "ios-safari": {
    subtitle: "홈 화면에서 바로 책피바라를 열어보세요",
    hint: (
      <p className="text-center text-xs text-[#9B948D] mb-4">
        하단{" "}
        <span className="inline-flex items-center gap-0.5 text-[#5A8A5A] font-medium">
          <ArrowUpFromLine size={12} />
          공유
        </span>{" "}
        버튼 →{" "}
        <span className="font-medium text-[#1C1A17]">홈 화면에 추가</span>
        를 탭하세요
      </p>
    ),
    ctaLabel: "홈 화면에 추가하기",
    ctaDisabled: true, // iOS Safari는 직접 prompt 불가
  },
  "ios-other": {
    subtitle: "Safari에서 홈 화면에 추가할 수 있어요",
    hint: (
      <p className="text-center text-xs text-[#9B948D] mb-4">
        iPhone에서는{" "}
        <span className="font-medium text-[#1C1A17]">Safari 브라우저</span>로 열어야
        홈 화면에 추가할 수 있어요
      </p>
    ),
    ctaLabel: "Safari로 열기",
    ctaDisabled: false,
  },
  android: {
    subtitle: "더 편리한 독서 경험을 시작하세요",
    hint: (
      <p className="text-center text-xs text-[#9B948D] mb-4">
        3초 만에 간편 추가, 언제든 삭제 가능
      </p>
    ),
    ctaLabel: "홈 화면에 추가하기",
    ctaDisabled: false,
  },
};

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [env, setEnv] = useState<Env>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const detected = detectEnv(navigator.userAgent);
    setEnv(detected);

    if (detected === "ios-safari" || detected === "ios-other") {
      setShow(true);
      return;
    }

    if (detected === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (env === "ios-safari") return; // 버튼이 안내용이라 동작 없음
    if (env === "ios-other") {
      // Safari로 현재 URL 열기
      window.location.href = `safari://${window.location.host}${window.location.pathname}`;
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + ONE_MONTH_MS));
    setShow(false);
  };

  if (!env) return null;
  const copy = ENV_COPY[env];

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Bottom sheet */}
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
                <img src="/logo.png" alt="책피바라" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-lg font-semibold text-[#1C1A17] leading-snug">책피바라를 앱으로</p>
                <p className="text-sm text-[#6B6560] mt-0.5">{copy.subtitle}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-[#9B948D] hover:text-[#1C1A17] transition-colors mt-1"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* Environment-specific hint */}
            {copy.hint}

            {/* CTA */}
            <button
              onClick={copy.ctaDisabled ? undefined : handleInstall}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-base transition-opacity ${
                copy.ctaDisabled
                  ? "bg-[#D0C8BC] text-[#9B948D] cursor-default"
                  : "bg-[#1C1A17] text-white active:opacity-80"
              }`}
            >
              {env === "ios-other" ? <SquareArrowOutUpRight size={18} /> : <ArrowUpFromLine size={18} />}
              {copy.ctaLabel}
            </button>

            {/* Later */}
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
  );
}
