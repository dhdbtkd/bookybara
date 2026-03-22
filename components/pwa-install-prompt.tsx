"use client";

import { useEffect } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "pwa-install": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        "manifest-url"?: string;
        "use-local-storage"?: boolean | string;
        "install-description"?: string;
        "icon"?: string;
        "name"?: string;
        "description"?: string;
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
      icon="/menifest.png"
      name="책피바라"
      description="우리들의 독서모임"
      install-description="홈 화면에 추가하면 앱처럼 바로 열 수 있어요"
      use-local-storage
    />
  );
}
