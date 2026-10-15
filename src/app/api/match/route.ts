import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findComplices } from "@/lib/matching";
import { moderate } from "@/lib/moderation";
import { firstError, matchSchema } from "@/lib/validation";

// POST /api/match { text } → qui peut aider, où, ce qu'il faut, quand, et le lien avec le Plan de la Ville (problème 1).
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  const parsed = matchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const mod = moderate(parsed.data.text);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
  return Response.json({ result: findComplices(parsed.data.text, me?.id ?? null) });
}
