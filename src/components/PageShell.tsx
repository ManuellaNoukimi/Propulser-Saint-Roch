"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";
import "./interface-motion.css";

export function PageShell({ children, topBar }: { children: ReactNode; topBar: ReactNode }) {
  const pathname = usePathname();
  const standalone = pathname === "/connexion" || pathname === "/inscription";

  return (
    <>
      {!standalone && topBar}
      {!standalone && <NavBar variant="side" pathname={pathname} />}
      <a href="#contenu" className="sr-only left-4 top-4 z-[100] rounded-xl bg-bg px-4 py-3 font-semibold focus:not-sr-only focus:fixed">Aller au contenu</a>
      <main
        id="contenu"
        className={standalone
          ? "flex min-h-dvh flex-col justify-center pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          : "app-main md:pl-[72px] xl:pl-[244px] pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-8"}
      >
        <ViewTransition key={pathname} name="page-content" share="page-swap" enter="page-swap" exit="page-swap" default="none">{children}</ViewTransition>
      </main>
      {!standalone && <NavBar variant="bottom" pathname={pathname} />}
    </>
  );
}
