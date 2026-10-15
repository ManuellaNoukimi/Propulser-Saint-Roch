import type { Metadata } from "next";
import { Suspense } from "react";
import { YAller } from "@/components/yaller/YAller";
import type { Place } from "@/lib/y-aller-types";

export const metadata: Metadata = { title: "Y aller · Complices" };

// /y-aller?vers=46.81,-71.22&nom=Parc des Pékans : arrive avec la destination déjà choisie (bouton « Itinéraire » d'un événement).
function destination(sp: Record<string, string | string[] | undefined>): Place | null {
  const [lat, lng] = String(sp.vers ?? "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !sp.vers) return null;
  return { label: String(sp.nom ?? "Destination").slice(0, 120), detail: null, lat, lng, kind: "lieu" };
}

// Onglet « Y aller » : trajet (auto, bus, vélo, à pied) et surtout où se garer à Saint-Roch.
// cacheComponents : les paramètres de l'adresse sont lus dans un <Suspense>.
export default function Page({ searchParams }: PageProps<"/y-aller">) {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-136px)] animate-pulse bg-soft md:h-dvh" />}>
      {searchParams.then((sp) => (
        <YAller initialTo={destination(sp)} />
      ))}
    </Suspense>
  );
}
