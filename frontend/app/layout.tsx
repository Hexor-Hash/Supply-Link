import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Toaster } from "sonner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supply-Link — Decentralized Supply Chain Tracker",
  description:
    "Transparent, tamper-proof product tracking from origin to consumer, powered by Stellar & Soroban.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={geist.className}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="supply-link-theme"
          >
            {children}
            <Toaster richColors position="bottom-right" />
            <InstallPrompt />
          </ThemeProvider>
        </QueryProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
