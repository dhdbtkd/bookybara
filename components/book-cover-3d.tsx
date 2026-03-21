"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";

interface Props {
  coverUrl: string | null;
  title: string;
}

export default function BookCover3D({ coverUrl, title }: Props) {
  const frameRef = useRef<number>(0);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 40, y: 35 });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        // Normalize to 0–1 across the full viewport
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        // Keep rotation subtle for page-wide tracking
        setRot({ x: (0.5 - y) * 10, y: (x - 0.5) * 14 });
        setShine({ x: x * 100, y: y * 100 });
      });
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div style={{ perspective: "1200px" }} className="flex justify-center items-center py-10 px-8 select-none">
      <div
        style={{
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          transformStyle: "preserve-3d",
          willChange: "transform",
          filter: `drop-shadow(${rot.y * 0.8}px ${-rot.x * 0.5}px 32px rgba(0,0,0,0.26)) drop-shadow(0 18px 36px rgba(0,0,0,0.16))`,
        }}
        className="relative"
      >
        {/* Book cover */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-52 h-80 md:w-60 md:h-[360px] object-cover rounded-lg relative z-10"
            draggable={false}
          />
        ) : (
          <div className="w-52 h-80 md:w-60 md:h-[360px] rounded-lg bg-[#E8DDD0] flex flex-col items-center justify-center gap-3 relative z-10">
            <BookOpen className="w-14 h-14 text-[#B8A898]" />
            <span className="text-xs text-[#B8A898] font-medium px-4 text-center leading-snug">{title}</span>
          </div>
        )}

        {/* Light sheen overlay */}
        <div
          style={{
            background: `radial-gradient(ellipse at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.10) 38%, transparent 65%)`,
            transition: "background 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
          className="absolute inset-0 rounded-lg z-20 pointer-events-none"
        />

        {/* Left spine highlight */}
        <div
          className="absolute inset-y-0 left-0 w-[5px] rounded-l-lg z-20 pointer-events-none"
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,${0.12 + Math.max(0, -rot.y / 14) * 0.3}), transparent)`,
          }}
        />

        {/* Top highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[4px] rounded-t-lg z-20 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, rgba(255,255,255,${0.08 + Math.max(0, rot.x / 10) * 0.28}), transparent)`,
          }}
        />
      </div>
    </div>
  );
}
