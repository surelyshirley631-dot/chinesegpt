"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation"; // Import usePathname
import "./globals.css";
import Navbar from "@/components/Navbar";
import FloatingAddButton from "@/components/FloatingAddButton";
import QuickInputBar from "@/components/QuickInputBar";
import { MemoryProvider } from "@/context/MemoryContext";
import { ToastProvider } from "@/context/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname(); // Get current pathname
  const showPinyinComponents = pathname === '/pinyin'; // Condition for showing components

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
      >
        <MemoryProvider>
          <ToastProvider>
            <Navbar />
            {children}
            {showPinyinComponents && <FloatingAddButton />}
            {showPinyinComponents && <QuickInputBar />}
          </ToastProvider>
        </MemoryProvider>
      </body>
    </html>
  );
}