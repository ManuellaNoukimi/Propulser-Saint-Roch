import type { Metadata, Viewport } from "next";
import { Suspense, ViewTransition } from "react";
import { NavBar, NavBarWithPath } from "@/components/NavBar";
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
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <SessionProvider>
          <TopBar />
          <Suspense fallback={<NavBar variant="side" pathname={null} />}>
            <NavBarWithPath variant="side" />
          </Suspense>
          <a href="#contenu" className="sr-only left-4 top-4 z-[100] rounded-xl bg-bg px-4 py-3 font-semibold focus:not-sr-only focus:fixed">Aller au contenu</a>
          <main id="contenu" className="app-main md:pl-[72px] xl:pl-[244px] pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-8">
            {/* Transition douce entre les pages (View Transitions de React 19.3) : la navigation reste fixe, le contenu glisse en fondu */}
            <ViewTransition default="page-swap">{children}</ViewTransition>
          </main>
          <Suspense fallback={<NavBar variant="bottom" pathname={null} />}>
            <NavBarWithPath variant="bottom" />
          </Suspense>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
