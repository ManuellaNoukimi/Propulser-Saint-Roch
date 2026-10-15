import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { answerInvitation } from "@/lib/db";
import { toInvitation } from "@/lib/invitations";
import { answerSchema, firstError } from "@/lib/validation";

// POST /api/invitations/:id { accept } : « Je suis complice » (devient complice de l'idée) ou « Pas cette fois »
export async function POST(req: NextRequest, ctx: RouteContext<"/api/invitations/[id]">) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  const parsed = answerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { id } = await ctx.params;
  const row = answerInvitation(id, me.id, parsed.data.accept);
  if (!row) return Response.json({ error: "Invitation introuvable." }, { status: 404 });
  return Response.json({ invitation: toInvitation(row) });
}
