import { connection } from "next/server";
import { layers } from "@/lib/y-aller";

// GET /api/y-aller/couches : stationnements, stations àVélo (en direct), supports à vélo, arrêts de bus et bornes autour de Saint-Roch.
export async function GET() {
  await connection();
  return Response.json(await layers());
}
