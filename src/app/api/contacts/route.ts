import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { GUEST_CANNOT_POST, isGuest } from "@/lib/constants";
import { ContactError, listContacts, sendContact } from "@/lib/contacts";
import { moderate } from "@/lib/moderation";
import { firstError } from "@/lib/validation";

const schema = z.object({
  toId: z.string().min(1).max(80),
  message: z.string().trim().min(1, "Écris un petit message.").max(800, "Message : 800 caractères maximum."),
}).strict();

// GET /api/contacts : messages reçus (« Contacter ») et envoyés, du compte connecté.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  return Response.json(listContacts(me.id));
}

// POST /api/contacts { toId, message } : contacter un acteur (commerce, entreprise, organisme).
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (isGuest(me.account_type)) return Response.json(GUEST_CANNOT_POST, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const mod = moderate(parsed.data.message);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
  try {
    return Response.json({ id: sendContact(me.id, parsed.data.toId, parsed.data.message) }, { status: 201 });
  } catch (e) {
    if (e instanceof ContactError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
