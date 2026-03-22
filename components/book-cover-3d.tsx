"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BookOpen } from "lucide-react";

/* ── 책 메시 ──────────────────────────────────────────────── */
function BookMesh({ coverUrl, mouse }: { coverUrl: string; mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);

  // 커버 텍스처
  const coverTex = useTexture(coverUrl);
  coverTex.colorSpace = THREE.SRGBColorSpace;

  // 책 치수 (Three.js 단위)
  const W = 1.4;  // 너비
  const H = 2.0;  // 높이
  const D = 0.14; // 두께(spine)

  // 마우스 기반 부드러운 회전
  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    const targetY = mx * 0.55;   // yaw  — 좌우
    const targetX = -my * 0.3;   // pitch — 상하
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.07;
  });

  // 각 면에 쓸 재질
  const spineMat = new THREE.MeshStandardMaterial({ color: "#4a3728", roughness: 0.7, metalness: 0.05 });
  const pageMat  = new THREE.MeshStandardMaterial({ color: "#f5f0e8", roughness: 0.9, metalness: 0 });
  const coverMat = new THREE.MeshStandardMaterial({
    map: coverTex,
    roughness: 0.35,
    metalness: 0.08,
  });

  return (
    <group ref={groupRef} rotation={[0, 0.35, 0]}>
      {/* 앞면 커버 */}
      <mesh position={[0, 0, D / 2]}>
        <planeGeometry args={[W, H]} />
        <primitive object={coverMat} attach="material" />
      </mesh>

      {/* 뒷면 (단색) */}
      <mesh position={[0, 0, -D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <primitive object={spineMat} attach="material" />
      </mesh>

      {/* 책등 (왼쪽) */}
      <mesh position={[-W / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <primitive object={spineMat} attach="material" />
      </mesh>

      {/* 페이지 면 (오른쪽) */}
      <mesh position={[W / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <primitive object={pageMat} attach="material" />
      </mesh>

      {/* 상단 */}
      <mesh position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <primitive object={pageMat} attach="material" />
      </mesh>

      {/* 하단 */}
      <mesh position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <primitive object={pageMat} attach="material" />
      </mesh>
    </group>
  );
}

/* ── 폴백: 표지 없을 때 ──────────────────────────────────── */
function PlaceholderMesh({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.55 - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.3 - groupRef.current.rotation.x) * 0.07;
  });
  return (
    <group ref={groupRef} rotation={[0, 0.35, 0]}>
      <mesh>
        <boxGeometry args={[1.4, 2.0, 0.14]} />
        <meshStandardMaterial color="#d4c5b0" roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ── Scene ───────────────────────────────────────────────── */
function Scene({ coverUrl }: { coverUrl: string | null }) {
  const mouse = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouse.current = [
        (e.clientX / window.innerWidth - 0.5) * 2,
        (e.clientY / window.innerHeight - 0.5) * 2,
      ];
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      {/* 조명 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 2, -2]} intensity={0.25} color="#d4c5b0" />
      <pointLight position={[0, 4, 3]} intensity={0.5} color="#fff8f0" />

      {/* 환경 반사 */}
      <Environment preset="apartment" />

      {/* 책 */}
      {coverUrl ? (
        <Suspense fallback={<PlaceholderMesh mouse={mouse} />}>
          <BookMesh coverUrl={coverUrl} mouse={mouse} />
        </Suspense>
      ) : (
        <PlaceholderMesh mouse={mouse} />
      )}
    </>
  );
}

/* ── 메인 export ─────────────────────────────────────────── */
export default function BookCover3D({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-10 px-8">
        <div className="w-52 h-80 md:w-60 md:h-[360px] rounded-lg bg-[#E8DDD0] flex items-center justify-center">
          <BookOpen className="w-14 h-14 text-[#B8A898]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center py-6 select-none" style={{ height: 380 }}>
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene coverUrl={coverUrl} />
      </Canvas>
    </div>
  );
}
