"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BookOpen } from "lucide-react";

const W = 1.4;   // 너비
const H = 2.0;   // 높이
const D = 0.28;  // 두께

/**
 * sagitta(s): 호가 현(chord)에서 얼마나 튀어나오는지
 * s가 클수록 둥글고, 작을수록 납작
 *
 * 원의 반지름: R = ((D/2)² + s²) / (2s)
 * 현에서 원 중심까지 거리: h = R - s
 *
 * 두 호(책등, 페이지 단면) 모두 "현의 오른쪽(+x)" 방향으로 원 중심을 놓고
 * -x 방향을 지나는 같은 arc 형태를 사용.
 *   - 책등: 원 중심이 책 내부(-W/2 + h) → 호가 왼쪽(-x)으로 볼록
 *   - 페이지 단면: 원 중심이 책 바깥(+W/2 + h) → 호가 왼쪽(안쪽)으로 볼록
 *                  BackSide 렌더링 → 뷰어 기준 오목하게 보임
 *
 * arc endpoint (현 양 끝점) = (−h, y, ±D/2) [local]
 * phi = atan2(x_local, z_local) [Three.js cylinder 좌표계]
 */
const s = D * 0.13;                                     // ← 이 값으로 곡률 조절
const R = ((D / 2) ** 2 + s ** 2) / (2 * s);
const h = R - s;

const phi1     = Math.atan2(-h, D / 2)  + 2 * Math.PI; // z=+D/2 끝점
const phi2     = Math.atan2(-h, -D / 2) + 2 * Math.PI; // z=-D/2 끝점
const arcStart = phi2;
const arcLen   = phi1 - phi2;                           // 항상 양수

const spineCx = -W / 2 + h;  // 책등 원 중심 x (책 내부)
const pageCx  =  W / 2 + h;  // 페이지 단면 원 중심 x (책 바깥)

/* ── 책 메시 ──────────────────────────────────────────────── */
function BookMesh({ coverUrl, mouse }: { coverUrl: string; mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const coverTex = useTexture(coverUrl);
  coverTex.colorSpace = THREE.SRGBColorSpace;

  const coverMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: coverTex, roughness: 0.15, metalness: 0.05,
  }), [coverTex]);
  const backMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a0e07", roughness: 0.75 }), []);
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a0e07", roughness: 0.15, metalness: 0.02 }), []);
  const pageMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ece7de", roughness: 0.92 }), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.5  - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.28 - groupRef.current.rotation.x) * 0.07;
  });

  return (
    <group ref={groupRef} rotation={[0, 0.5, 0]}>
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

      {/* 상단 페이지 단면 */}
      <mesh position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <primitive object={pageMat} attach="material" />
      </mesh>

      {/* 하단 페이지 단면 */}
      <mesh position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <primitive object={pageMat} attach="material" />
      </mesh>

      {/*
        책등 — 왼쪽, -x 방향으로 볼록
        원 중심을 책 내부(spineCx)에 놓고 -x를 지나는 호
        법선이 -x를 향해 FrontSide로 뷰어에게 볼록하게 보임
      */}
      <mesh position={[spineCx, 0, 0]}>
        <cylinderGeometry args={[R, R, H, 64, 1, true, arcStart, arcLen]} />
        <primitive object={spineMat} attach="material" />
      </mesh>

      {/*
        페이지 단면 — 오른쪽, 안쪽(-x)으로 오목
        원 중심을 책 바깥(pageCx)에 놓고 -x를 지나는 호
        법선이 -x를 향하므로 BackSide로 렌더 → 오목하게 보임
      */}
      <mesh position={[pageCx, 0, 0]}>
        <cylinderGeometry args={[R, R, H, 64, 1, true, arcStart, arcLen]} />
        <meshStandardMaterial color="#ece7de" roughness={0.92} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ── 폴백 ─────────────────────────────────────────────────── */
function PlaceholderMesh({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d4c5b0", roughness: 0.85 }), []);
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2518", roughness: 0.8 }), []);
  const pageMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ece7de", roughness: 0.92 }), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const [mx, my] = mouse.current;
    groupRef.current.rotation.y += (mx * 0.5  - groupRef.current.rotation.y) * 0.07;
    groupRef.current.rotation.x += (-my * 0.28 - groupRef.current.rotation.x) * 0.07;
  });

  return (
    <group ref={groupRef} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0, D / 2]}><planeGeometry args={[W, H]} /><primitive object={bodyMat} attach="material" /></mesh>
      <mesh position={[0, 0, -D / 2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[W, H]} /><primitive object={spineMat} attach="material" /></mesh>
      <mesh position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><primitive object={pageMat} attach="material" /></mesh>
      <mesh position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><primitive object={pageMat} attach="material" /></mesh>
      <mesh position={[spineCx, 0, 0]}>
        <cylinderGeometry args={[R, R, H, 64, 1, true, arcStart, arcLen]} />
        <primitive object={spineMat} attach="material" />
      </mesh>
      <mesh position={[pageCx, 0, 0]}>
        <cylinderGeometry args={[R, R, H, 64, 1, true, arcStart, arcLen]} />
        <meshStandardMaterial color="#ece7de" roughness={0.92} side={THREE.BackSide} />
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
        (e.clientX / window.innerWidth  - 0.5) * 2,
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
