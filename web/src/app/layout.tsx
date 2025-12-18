import type { Metadata } from "next";
import { VT323 } from "next/font/google"; // Hacker font
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

export const metadata: Metadata = {
  title: "Solana Bridge Terminal",
  description: "Secure Uplink to Base Chain",
};

import AppWalletProvider from "@/components/AppWalletProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${vt323.variable} font-mono antialiased bg-black text-green-500`}
      >
        <AppWalletProvider>{children}</AppWalletProvider>
      </body>
    </html>
  );
}
