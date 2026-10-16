import { connection } from "next/server";
import { goEvents } from "@/lib/y-aller";

// GET /api/y-aller/evenements : activités de l'app et événements de la Ville à Saint-Roch, en direct ou à venir, placés sur la carte.
export async function GET() {
  await connection();
  return Response.json({ events: await goEvents(new Date()) });
}
