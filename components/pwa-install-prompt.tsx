"use client";

import { useEffect } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "pwa-install": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        "manifest-url"?: string;
        "use-local-storage"?: boolean | string;
        "install-description"?: string;
      }, HTMLElement>;
    }
  }
}

export default function PwaInstallPrompt() {
  useEffect(() => {
    import("@khmyznikov/pwa-install").catch(() => {});

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <pwa-install
      manifest-url="/manifest.webmanifest"
      use-local-storage
    />
  );
}
