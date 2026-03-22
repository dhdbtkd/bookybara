"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Zap, Bell, WifiOff, ArrowUpFromLine } from "lucide-react";

const DISMISSED_KEY = "pwa_prompt_dismissed_until";
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already running as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Already dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // iOS detection
    const ua = navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    setIsIos(iosDevice && isSafari);

    if (iosDevice && isSafari) {
      setShow(true);
      return;
    }

    // Android / Chrome: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      // iOS: can't trigger programmatically, just dismiss and user reads the hint
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + ONE_MONTH_MS));
    setShow(false);
  };

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
              {/* App icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#F0EAE0] flex items-center justify-center flex-shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="책피바라" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-lg font-semibold text-[#1C1A17] leading-snug">책피바라를 앱으로</p>
                <p className="text-sm text-[#6B6560] mt-0.5">더 편리한 독서 경험을 시작하세요</p>
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
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 bg-[#EEF4EE] rounded-2xl py-4"
                >
                  <div className="w-10 h-10 rounded-full bg-[#5A8A5A] flex items-center justify-center">
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-xs text-[#3A5A3A] font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* iOS hint */}
            {isIos && (
              <p className="text-center text-xs text-[#9B948D] mb-4">
                Safari 하단의{" "}
                <span className="inline-flex items-center gap-0.5 text-[#5A8A5A] font-medium">
                  <ArrowUpFromLine size={12} />
                  공유
                </span>{" "}
                버튼을 눌러 <span className="font-medium text-[#1C1A17]">홈 화면에 추가</span>하세요
              </p>
            )}

            {!isIos && (
              <p className="text-center text-xs text-[#9B948D] mb-4">3초 만에 간편 추가, 언제든 삭제 가능</p>
            )}

            {/* CTA */}
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 bg-[#1C1A17] text-white rounded-2xl py-4 font-semibold text-base active:opacity-80 transition-opacity"
            >
              <ArrowUpFromLine size={18} />
              홈 화면에 추가하기
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
