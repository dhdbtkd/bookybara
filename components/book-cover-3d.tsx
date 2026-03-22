"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BookOpen } from "lucide-react";

const W = 1.4;   // 너비
const H = 2.0;   // 높이
const D = 0.28;  // 두께

/*
  BoxGeometry 6면 재질 순서
  0: +x (right)  → 페이지 단면
  1: -x (left)   → 책등
  2: +y (top)    → 페이지 단면 (위)
  3: -y (bottom) → 페이지 단면 (아래)
  4: +z (front)  → 앞표지
  5: -z (back)   → 뒷표지
*/

/* ── 책 메시 ──────────────────────────────────────────────── */
function BookMesh({ coverUrl, mouse }: { coverUrl: string; mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const coverTex = useTexture(coverUrl);
  coverTex.colorSpace = THREE.SRGBColorSpace;

  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: "#ede8df", roughness: 0.92, metalness: 0 }),   // 페이지 단면 우
    new THREE.MeshStandardMaterial({ color: "#1a0e07", roughness: 0.75, metalness: 0.02 }), // 책등 좌
    new THREE.MeshStandardMaterial({ color: "#ede8df", roughness: 0.92, metalness: 0 }),   // 페이지 단면 상
    new THREE.MeshStandardMaterial({ color: "#ede8df", roughness: 0.92, metalness: 0 }),   // 페이지 단면 하
    new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.25, metalness: 0.05 }),   // 앞표지
    new THREE.MeshStandardMaterial({ color: "#1a0e07", roughness: 0.75, metalness: 0.02 }), // 뒷표지
  ], [coverTex]);

  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.5 - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.28 - groupRef.current.rotation.x) * 0.07;
  });

  return (
    <group ref={groupRef} rotation={[0, 0.5, 0]}>
      <mesh material={materials} castShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
    </group>
  );
}

/* ── 폴백 ─────────────────────────────────────────────────── */
function PlaceholderMesh({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);

  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: "#ede8df", roughness: 0.92 }), // pages
    new THREE.MeshStandardMaterial({ color: "#3a2518", roughness: 0.8 }),  // spine
    new THREE.MeshStandardMaterial({ color: "#ede8df", roughness: 0.92 }), // top
    new THREE.MeshStandardMaterial({ color: "#ede8df", roughness: 0.92 }), // bottom
    new THREE.MeshStandardMaterial({ color: "#d4c5b0", roughness: 0.85 }), // front
    new THREE.MeshStandardMaterial({ color: "#3a2518", roughness: 0.8 }),  // back
  ], []);

  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.5 - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.28 - groupRef.current.rotation.x) * 0.07;
  });

  return (
    <group ref={groupRef} rotation={[0, 0.5, 0]}>
      <mesh material={materials}>
        <boxGeometry args={[W, H, D]} />
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} />
      <directionalLight position={[-4, 1, 2]} intensity={0.4} color="#c8b89a" />
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
