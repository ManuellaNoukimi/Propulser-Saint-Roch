"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useSpace } from "@/lib/space";

// Raccourci « À découvrir » de l'en-tête mobile : seulement dans l'espace Vie Saint-Roch.
export function TopBarDiscover() {
  if (useSpace(null) === "entreprises") return null;
  return (
    <Link href="/fonctionnalites" aria-label="Toutes les fonctionnalités" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-soft">
      <Compass size={22} strokeWidth={1.8} />
    </Link>
  );
}
