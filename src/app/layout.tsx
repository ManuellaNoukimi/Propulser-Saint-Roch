import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ResidentPointFeedback } from "@/components/ResidentPointFeedback";
import { RegistrationConfirmation } from "@/components/RegistrationConfirmation";
import { Toaster } from "@/components/Toaster";
import { TopBar } from "@/components/TopBar";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

// Police Inter (style HACKATHON26), utilisée par body via --font-inter (globals.css).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Complices · Saint-Roch",
  description:
    "Complices reconnecte les résidents, travailleurs, commerçants et organismes de Saint-Roch : publie ton idée, trouve tes complices, fais vivre le quartier.",
  // Sur téléphone : « Ajouter à l'écran d'accueil » ouvre Complices en plein écran, avec son icône (manifest.ts).
  applicationName: "Complices",
  appleWebApp: { capable: true, title: "Complices", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Des extensions injectent des attributs sur <html> avant React (ex. data-scribe-recorder-ready).
  // La tolérance concerne uniquement cette racine, pas les composants enfants.
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          <Suspense fallback={<main id="contenu" className="app-main md:pl-[72px] xl:pl-[244px] pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-8">{children}</main>}>
            <PageShell topBar={<TopBar />}>{children}</PageShell>
          </Suspense>
          <Toaster />
          <ResidentPointFeedback />
          <RegistrationConfirmation />
        </SessionProvider>
      </body>
    </html>
  );
}
