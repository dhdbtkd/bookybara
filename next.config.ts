import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@blocknote/core", "@blocknote/react", "@blocknote/mantine", "three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
