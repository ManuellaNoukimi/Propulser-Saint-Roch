import { connection } from "next/server";
import { listActors, listSdcDirectory } from "@/lib/actors";

// GET /api/annuaire : comptes Commerce / Entreprise / Organisme de l'app, et commerces de la liste SDC (lus à l'exécution).
export async function GET() {
  await connection();
  const actors = listActors();
  return Response.json({ actors, sdc: listSdcDirectory(actors) });
}
