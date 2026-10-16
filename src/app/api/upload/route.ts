import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { GUEST_CANNOT_POST, isGuest } from "@/lib/constants";
import { UPLOAD_DIR } from "@/lib/db";

const MAX_BYTES = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// POST /api/upload (multipart, champ « file ») → { url: "/api/uploads/<id>.<ext>" }
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (isGuest(me.account_type)) return Response.json(GUEST_CANNOT_POST, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Aucune image reçue." }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return Response.json({ error: "Format accepté : JPEG, PNG ou WebP." }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image trop lourde (4 Mo maximum)." }, { status: 413 });

  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/api/uploads/${name}` }, { status: 201 });
}
