"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BookOpen } from "lucide-react";

// 책 치수
const W = 1.4;   // 너비
const H = 2.0;   // 높이
const D = 0.30;  // 두께 (두껍게)

/* ── 책 메시 ──────────────────────────────────────────────── */
function BookMesh({ coverUrl, mouse }: { coverUrl: string; mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const coverTex = useTexture(coverUrl);
  coverTex.colorSpace = THREE.SRGBColorSpace;

  const coverMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: coverTex, roughness: 0.3, metalness: 0.06,
  }), [coverTex]);

  // 책등: 진한 갈색
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#2e1f14", roughness: 0.8, metalness: 0.02,
  }), []);

  // 페이지 단면: 크림 화이트, 약간 거칠게
  const pageMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#f2ede5", roughness: 0.95, metalness: 0,
  }), []);

  // 뒷표지: 커버보다 약간 어둡게
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#2e1f14", roughness: 0.7, metalness: 0.04,
  }), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.5 - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.28 - groupRef.current.rotation.x) * 0.07;
  });

  return (
    <group ref={groupRef} rotation={[0, 0.4, 0]}>
      {/* 앞표지 */}
      <mesh position={[0, 0, D / 2]}>
        <planeGeometry args={[W, H]} />
        <primitive object={coverMat} attach="material" />
      </mesh>

      {/* 뒷표지 */}
      <mesh position={[0, 0, -D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <primitive object={backMat} attach="material" />
      </mesh>

      {/* 책등 — 왼쪽, 평평 */}
      <mesh position={[-W / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <primitive object={spineMat} attach="material" />
      </mesh>

      {/* 상단 (페이지 단면) */}
      <mesh position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <primitive object={pageMat} attach="material" />
      </mesh>

      {/* 하단 (페이지 단면) */}
      <mesh position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <primitive object={pageMat} attach="material" />
      </mesh>

      {/*
        페이지 단면 — 오른쪽: 반원기둥으로 볼록하게
        CylinderGeometry(radius, radius, height, segments, _, open, phiStart, phiLength)
        phiStart = -π/2, phiLength = π → +x 방향으로 볼록한 반원
        center at x = W/2, radius = D/2 → 앞뒤 모서리(z=±D/2)에서 box와 정확히 이어짐
      */}
      <mesh position={[W / 2, 0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[D / 2, D / 2, H, 32, 1, true, -Math.PI / 2, Math.PI]} />
        <primitive object={pageMat} attach="material" />
      </mesh>
    </group>
  );
}

/* ── 폴백 ─────────────────────────────────────────────────── */
function PlaceholderMesh({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const pageMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f2ede5", roughness: 0.95 }), []);
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2e1f14", roughness: 0.8 }), []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d4c5b0", roughness: 0.8 }), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.5 - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.28 - groupRef.current.rotation.x) * 0.07;
  });

  return (
    <group ref={groupRef} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0, D / 2]}><planeGeometry args={[W, H]} /><primitive object={bodyMat} attach="material" /></mesh>
      <mesh position={[0, 0, -D / 2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[W, H]} /><primitive object={spineMat} attach="material" /></mesh>
      <mesh position={[-W / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[D, H]} /><primitive object={spineMat} attach="material" /></mesh>
      <mesh position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><primitive object={pageMat} attach="material" /></mesh>
      <mesh position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><primitive object={pageMat} attach="material" /></mesh>
      <mesh position={[W / 2, 0, 0]}>
        <cylinderGeometry args={[D / 2, D / 2, H, 32, 1, true, -Math.PI / 2, Math.PI]} />
        <primitive object={pageMat} attach="material" />
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
      <ambientLight intensity={0.55} />
      {/* 주광: 우상단에서 → 커버에 자연스러운 하이라이트 */}
      <directionalLight position={[3, 4, 5]} intensity={1.8} />
      {/* 보조광: 좌측에서 → 책등에 미묘한 빛 */}
      <directionalLight position={[-3, 1, 2]} intensity={0.35} color="#c8b89a" />
      {/* 하단 반사광: 바닥 반사 느낌 */}
      <pointLight position={[0, -3, 3]} intensity={0.2} color="#fff4e0" />
      <Environment preset="apartment" />

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

/* ── export ──────────────────────────────────────────────── */
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
    <div className="w-full flex justify-center items-center select-none" style={{ height: 400 }}>
      <Canvas
        camera={{ position: [0, 0, 3.4], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene coverUrl={coverUrl} />
      </Canvas>
    </div>
  );
}
