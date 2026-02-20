import { TRPCProvider } from "@/lib/trpc-provider";
import pkg from "@/package.json";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: pkg.title ?? pkg.name,
  description: pkg.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          {children}
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
