import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "책피바라",
    short_name: "책피바라",
    description: "우리들의 독서모임",
    start_url: "/",
    display: "standalone",
    background_color: "#F0EAE0",
    theme_color: "#F0EAE0",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
