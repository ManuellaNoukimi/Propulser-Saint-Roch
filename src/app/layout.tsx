import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ResidentPointFeedback } from "@/components/ResidentPointFeedback";
import { Toaster } from "@/components/Toaster";
import { TopBar } from "@/components/TopBar";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Complices · Saint-Roch",
  description:
    "Complices reconnecte les résidents, travailleurs, commerçants et organismes de Saint-Roch : publie ton idée, trouve tes complices, fais vivre le quartier.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111214" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Des extensions injectent des attributs sur <html> avant React (ex. data-scribe-recorder-ready).
  // La tolérance concerne uniquement cette racine, pas les composants enfants.
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">
        <SessionProvider>
          <Suspense fallback={<main id="contenu" className="app-main md:pl-[72px] xl:pl-[244px] pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-8">{children}</main>}>
            <PageShell topBar={<TopBar />}>{children}</PageShell>
          </Suspense>
          <Toaster />
          <ResidentPointFeedback />
        </SessionProvider>
      </body>
    </html>
  );
}
