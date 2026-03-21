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
        <Nav />
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4 md:py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
