import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { FleetProvider } from "@/components/providers/FleetProvider";
import { GlassNav } from "@/components/ui/GlassNav";
import { getInitialFleet, getRecentAlerts } from "@/lib/data";
import { getSessionUser } from "@/lib/supabase/server";

import "./globals.css";

// SF Pro is not available on Windows/Android; Inter is the closest open fallback.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SmartGrid Pulse",
    template: "%s · SmartGrid Pulse",
  },
  description:
    "Endüstriyel IoT filosu için gerçek zamanlı anomali tespiti ve kestirimci bakım paneli.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // First paint is rendered on the server; Realtime takes over in the browser.
  const [user, devices, alerts] = await Promise.all([
    getSessionUser(),
    getInitialFleet(),
    getRecentAlerts(20),
  ]);

  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-dvh">
        <FleetProvider initialDevices={devices} initialAlerts={alerts} user={user}>
          <a
            href="#icerik"
            className="sr-only z-[60] rounded-pill bg-accent-fill px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
          >
            İçeriğe atla
          </a>
          <GlassNav />
          <main id="icerik">{children}</main>
          <footer className="border-t border-hairline/10 bg-canvas-alt">
            <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-8 text-[13px] text-ink-secondary sm:flex-row sm:justify-between sm:px-6">
              <p>SmartGrid Pulse · Sanal sensörler, gerçek zamanlı anomali tespiti.</p>
              <p>Next.js · Supabase · MQTT · scikit-learn</p>
            </div>
          </footer>
        </FleetProvider>
      </body>
    </html>
  );
}
