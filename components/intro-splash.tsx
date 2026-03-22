"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Phase = "logo" | "circle" | "done";

export default function IntroSplash() {
  const [phase, setPhase] = useState<Phase>("logo");

  useEffect(() => {
    if (sessionStorage.getItem("intro-shown")) {
      setPhase("done");
      return;
    }
    // 로고 떠오름 → 1.4s 후 원 확장 시작 → 1.2s 후 완료
    const t1 = setTimeout(() => setPhase("circle"), 1400);
    const t2 = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("intro-shown", "1");
    }, 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-none">
      {/* 흰 배경 */}
      <div className="absolute inset-0 bg-white" />

      {/* 로고 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ zIndex: 1 }}>
        <AnimatePresence>
          {phase !== "done" && (
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }}
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
          initial={{ width: 0, height: 0 }}
          animate={{ width: "300vmax", height: "300vmax" }}
          transition={{ duration: 1.15, ease: [0.4, 0, 0.15, 1] }}
        />
      )}
    </div>
  );
}
