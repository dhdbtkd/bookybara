"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HomeBookScene({ coverUrl }: { coverUrl: string | null }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // The illustrated HTML book underneath remains visible.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.z = 6.1;
    scene.add(new THREE.HemisphereLight(0xfffbf3, 0x6b3b2b, 1.45));
    const keyLight = new THREE.SpotLight(0xfff1d6, 38, 14, Math.PI / 5, 0.72, 1.25);
    keyLight.position.set(-3.2, 4.5, 5.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(window.innerWidth < 768 ? 512 : 1024, window.innerWidth < 768 ? 512 : 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);
    const rimLight = new THREE.SpotLight(0x9b4634, 28, 11, Math.PI / 4, 0.85, 1.4);
    rimLight.position.set(3.8, 1.2, -2.6);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0xffcf9f, 7, 9, 1.6);
    fillLight.position.set(2.6, -1.1, 3.8);
    scene.add(fillLight);

    const textures: THREE.Texture[] = [];
    function book(color: string, width: number, height: number, depth: number) {
      const group = new THREE.Group();
      const paper = new THREE.MeshStandardMaterial({ color: "#fff8df", roughness: 0.88 });
      const jacket = new THREE.MeshPhysicalMaterial({ color, roughness: 0.46, clearcoat: 0.22, clearcoatRoughness: 0.35 });
      const block = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, height - 0.09, depth), paper);
      group.add(block);
      for (const z of [-depth / 2 - 0.022, depth / 2 + 0.022]) {
        const cover = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.045), jacket);
        cover.position.z = z;
        group.add(cover);
      }
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.085, height, depth + 0.09), jacket);
      spine.position.x = -width / 2 + 0.02;
      group.add(spine);
      // Fine paper edges make the book read as a physical object at an angle.
      for (let i = 1; i < 16; i++) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(width - 0.07, 0.007, 0.003), new THREE.MeshBasicMaterial({ color: "#cfbea0" }));
        edge.position.set(0, height / 2 - 0.042, -depth / 2 + depth * i / 16);
        group.add(edge);
      }
      return group;
    }

    const main = book("#8B3A2A", 1.85, 2.65, 0.32);
    main.position.set(0, 0.03, 0.3);
    main.rotation.set(-0.13, -0.36, -0.08);
    main.traverse(object => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    scene.add(main);
    keyLight.target = main;
    rimLight.target = main;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.7),
      new THREE.ShadowMaterial({ color: 0x5f3328, opacity: 0.2 }),
    );
    shadow.position.set(0, -1.53, -0.15);
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    scene.add(shadow);
    const canvas = document.createElement("canvas");
    canvas.width = 560; canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#8B3A2A"; ctx.fillRect(0, 0, 560, 800);
    ctx.fillStyle = "#F0EAE0"; ctx.font = "bold 74px sans-serif";
    ctx.fillText("BOOK", 55, 130); ctx.fillText("YBARA", 55, 215);
    ctx.font = "22px sans-serif"; ctx.fillText("A LITTLE BOOK. A BIG WORLD.", 55, 715);
    ctx.strokeStyle = "#F0EAE0"; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.ellipse(280, 450, 155, 120, -0.3, 0, Math.PI * 2); ctx.stroke();
    const placeholder = new THREE.CanvasTexture(canvas);
    placeholder.colorSpace = THREE.SRGBColorSpace;
    textures.push(placeholder);
    const frontMaterial = new THREE.MeshPhysicalMaterial({
      map: placeholder,
      roughness: 0.42,
      clearcoat: 0.28,
      clearcoatRoughness: 0.3,
      sheen: 0.12,
      sheenColor: new THREE.Color("#fff1d6"),
    });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 2.64), frontMaterial);
    front.position.z = 0.208;
    front.castShadow = true;
    main.add(front);
    let disposed = false;
    let frame = 0;
    let visible = true;
    let mx = 0, my = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function render() {
      renderer.render(scene, camera);
    }
    function animate(time: number) {
      if (!visible || disposed || reduced.matches) return;
      main.rotation.y += (-0.36 + mx * 0.2 - main.rotation.y) * 0.065;
      main.rotation.x += (-0.13 + my * 0.12 - main.rotation.x) * 0.065;
      main.position.y = 0.03 + Math.sin(time * 0.00065) * 0.055;
      keyLight.position.x += (-3.2 + mx * 0.75 - keyLight.position.x) * 0.04;
      keyLight.position.y += (4.5 - my * 0.45 - keyLight.position.y) * 0.04;
      render(); frame = requestAnimationFrame(animate);
    }
    function restart() {
      cancelAnimationFrame(frame);
      render();
      if (visible && !reduced.matches) frame = requestAnimationFrame(animate);
    }
    if (coverUrl) new THREE.TextureLoader().load(coverUrl, (texture) => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.push(texture); frontMaterial.map = texture; frontMaterial.needsUpdate = true;
      render();
    }, undefined, () => { /* Keep our original cover if the remote cover is unavailable. */ });
    const resize = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      camera.position.z = width < 500 ? 6.1 : 5.55;
      renderer.setSize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix(); render();
    });
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && !document.hidden; restart(); });
    intersection.observe(element);
    const onVisibility = () => { visible = !document.hidden && element.getBoundingClientRect().bottom > 0; restart(); };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = element.getBoundingClientRect();
      mx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      my = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => { mx = 0; my = 0; };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    reduced.addEventListener("change", restart);
    document.addEventListener("visibilitychange", onVisibility);
    element.dataset.ready = "true";
    restart();
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
      element.removeEventListener("pointermove", onMove); element.removeEventListener("pointerleave", onLeave);
      reduced.removeEventListener("change", restart); document.removeEventListener("visibilitychange", onVisibility);
      const materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
      materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
      renderer.dispose(); renderer.domElement.remove(); delete element.dataset.ready;
    };
  }, [coverUrl]);

  return <div ref={host} className="home-book-canvas" aria-hidden="true" />;
}
