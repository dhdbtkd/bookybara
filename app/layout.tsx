import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";
import IntroSplash from "@/components/intro-splash";
import { Toaster } from "@/components/ui/sonner";
import ScrollToTop from "@/components/scroll-to-top";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  colorScheme: "light",
};

export const metadata: Metadata = {
  // 상대 경로 OG·canonical 이 이 주소를 기준으로 절대 주소가 된다.
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} · 우리들의 독서모임`,
    // 하위 페이지는 제 이름만 쓰고 꼬리표는 여기서 붙인다.
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["독서모임", "독후감", "책 추천", "북클럽", siteName],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Search Console 소유 확인. 지우면 확인이 풀린다.
  verification: { google: "XzJ_QklYniqOja5QnOFeKo7UiS0NdpYXsuJ72Fde9H0" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName,
    url: "/",
    title: `${siteName} · 우리들의 독서모임`,
    description: siteDescription,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} · 우리들의 독서모임`,
    description: siteDescription,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${playfair.variable} h-full antialiased`} style={{ colorScheme: "light" }}>
<body className="h-full flex flex-col bg-[#F0EAE0] font-sans">
        {/* 배경 장식 orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#C8956C] opacity-[0.07] blur-[120px]" />
          <div className="absolute top-[20%] -right-40 w-[600px] h-[600px] rounded-full bg-[#8B3A2A] opacity-[0.06] blur-[140px]" />
          <div className="absolute top-[50%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#D4A574] opacity-[0.08] blur-[100px]" />
          <div className="absolute bottom-[10%] -left-20 w-[480px] h-[480px] rounded-full bg-[#A0522D] opacity-[0.05] blur-[130px]" />
          <div className="absolute bottom-0 right-[10%] w-[360px] h-[360px] rounded-full bg-[#C8956C] opacity-[0.07] blur-[110px]" />
        </div>
        <IntroSplash />
        <Nav />
        <main className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4 md:py-8">{children}</main>
        <ScrollToTop />
        <PwaInstallPrompt />
        <Toaster />
      </body>
    </html>
  );
}
