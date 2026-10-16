import { connection } from "next/server";
import { saintRochStreets } from "@/lib/saint-roch-streets";

// GET /api/rues-saint-roch : rues du quartier avec un point au milieu (adresses officielles de la Ville, données ouvertes).
// Utilisé par la carte des locaux vacants pour regrouper par rue les locaux dont l'adresse exacte n'est pas connue.
export async function GET() {
  await connection();
  return Response.json({ streets: saintRochStreets() });
}
