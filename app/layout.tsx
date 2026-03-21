import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "독서모임",
  description: "우리들의 독서모임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${playfair.variable} h-full antialiased`}>
      <body className="h-full flex flex-col bg-[#F0EAE0] font-sans">
        {/* 배경 장식 orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#C8956C] opacity-[0.07] blur-[120px]" />
          <div className="absolute top-[20%] -right-40 w-[600px] h-[600px] rounded-full bg-[#8B3A2A] opacity-[0.06] blur-[140px]" />
          <div className="absolute top-[50%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#D4A574] opacity-[0.08] blur-[100px]" />
          <div className="absolute bottom-[10%] -left-20 w-[480px] h-[480px] rounded-full bg-[#A0522D] opacity-[0.05] blur-[130px]" />
          <div className="absolute bottom-0 right-[10%] w-[360px] h-[360px] rounded-full bg-[#C8956C] opacity-[0.07] blur-[110px]" />
        </div>
        <Nav />
        <main className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4 md:py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
