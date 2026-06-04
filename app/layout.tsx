import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FormGuard } from "@/components/form-guard";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NDIS Care Management",
  description: "Care management system for Australian disability support providers"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className={`${inter.variable} font-sans antialiased`}>
        <FormGuard />
        {children}
      </body>
    </html>
  );
}
