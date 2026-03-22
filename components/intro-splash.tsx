"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

// 새로고침 시 JS 모듈이 재로드되어 리셋됨 → 다시 표시
// 클라이언트 사이드 네비게이션 시엔 유지 → 재표시 안 함
let hasShownIntro = false;

type Phase = "logo" | "circle" | "done";
type ActivePhase = "logo" | "circle";

export default function IntroSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("logo");

  useEffect(() => {
    if (hasShownIntro || pathname !== "/") {
      setPhase("done");
      return;
    }
    hasShownIntro = true;
    const t1 = setTimeout(() => setPhase("circle"), 1400);
    const t2 = setTimeout(() => setPhase("done"), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-none">
      {/* 흰 배경 — 원 확장 시작 후 빠르게 페이드아웃 */}
      <motion.div
        className="absolute inset-0 bg-white"
        animate={phase === "circle" ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      />

      {/* 로고 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ zIndex: 1 }}>
        <AnimatePresence>
          {(phase === "logo" || phase === "circle") && (
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ y: 48, opacity: 0 }}
              animate={(phase as ActivePhase) === "circle" ? { opacity: 0 } : { y: 0, opacity: 1 }}
              transition={(phase as ActivePhase) === "circle" ? { duration: 0.15 } : { duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="책피바라" className="h-16 w-auto" />
              <span
                style={{
                  fontFamily: "Eulyoo, serif",
                  fontSize: 28,
                  color: "#1C1A17",
                  letterSpacing: "0.15em",
                }}
              >
                책피바라
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 원 확장 (가운데에서 blur 경계로 퍼짐) */}
      {phase === "circle" && (
        <motion.div
          style={{
            position: "absolute",
            borderRadius: "50%",
            background: "#F0EAE0",
            filter: "blur(28px)",
            left: "50%",
            top: "50%",
            translateX: "-50%",
            translateY: "-50%",
            zIndex: 2,
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: "160vmax", height: "160vmax", opacity: [1, 1, 0] }}
          transition={{ duration: 1.0, ease: [0.4, 0, 0.15, 1], opacity: { duration: 1.0, times: [0, 0.5, 1] } }}
        />
      )}
    </div>
  );
}
