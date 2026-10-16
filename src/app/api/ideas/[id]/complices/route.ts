import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { alreadyJoined, ideaExists, insertComplice, leaveIdea } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { firstError, joinSchema } from "@/lib/validation";

// POST /api/ideas/:id/complices : tout compte (habitant, commerce, organisme…) peut se proposer
export async function POST(req: NextRequest, ctx: RouteContext<"/api/ideas/[id]/complices">) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  const { id } = await ctx.params;
  if (!ideaExists(id)) return Response.json({ error: "Cette publication n'existe pas (ou plus)." }, { status: 404 });

  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const mod = moderate(parsed.data.message);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
  if (alreadyJoined(id, me.id, parsed.data.contribution)) {
    return Response.json({ error: "Tu t'es déjà proposé·e de cette façon pour cette idée." }, { status: 409 });
  }
  try {
    return Response.json({ id: insertComplice(id, me.id, parsed.data) }, { status: 201 });
  } catch (error) {
    // Another request can have inserted the same contribution after the initial check.
    if (error && typeof error === "object" && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE" && alreadyJoined(id,me.id,parsed.data.contribution)) {
      return Response.json({error:"Tu t'es déjà proposé·e de cette façon pour cette idée."},{status:409});
    }
    throw error;
  }
}

// DELETE /api/ideas/:id/complices : se désinscrire (retire sa participation, son aide, son matériel… pour cette activité)
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/ideas/[id]/complices">) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  const { id } = await ctx.params;
  if (!ideaExists(id)) return Response.json({ error: "Cette publication n'existe pas (ou plus)." }, { status: 404 });
  const removed = leaveIdea(id, me.id);
  if (!removed) return Response.json({ error: "Tu n'étais pas inscrit·e à cette activité." }, { status: 404 });
  return Response.json({ removed });
}
