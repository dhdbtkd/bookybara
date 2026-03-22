import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@blocknote/core", "@blocknote/react", "@blocknote/mantine", "three", "@react-three/fiber", "@react-three/drei"],
  allowedDevOrigins: ["192.168.50.26", "ca81-14-42-185-175.ngrok-free.app"],
};

export default nextConfig;
