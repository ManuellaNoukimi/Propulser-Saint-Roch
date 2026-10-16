import { connection } from "next/server";
import { cityEvents } from "@/lib/city-events";
import { knownPlace } from "@/lib/place-coords";

// GET /api/evenements-ville : tous les événements de Saint-Roch du fichier Excel de la Ville (passés et à venir),
// lus à l'exécution. lat/lng seulement si le lieu est connu (pour le bouton « Y aller »).
export async function GET() {
  await connection();
  const events = (await cityEvents()).map((ev) => {
    const site = ev.sites.find((s) => knownPlace(s)) ?? null;
    return { ...ev, at: site ? knownPlace(site) : null };
  });
  return Response.json({ events });
}
