import { connection } from "next/server";
import { getSdcDirectoryEntry } from "@/lib/actors";

// GET /api/annuaire/sdc/:id : fiche d'un commerce de la liste SDC.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await ctx.params;
  const entry = getSdcDirectoryEntry(id);
  return entry ? Response.json({ entry }) : Response.json({ error: "Fiche introuvable." }, { status: 404 });
}
