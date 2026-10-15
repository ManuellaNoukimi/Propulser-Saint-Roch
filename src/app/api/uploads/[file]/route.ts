import { connection, type NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// GET /api/uploads/<id>.<ext> : sert une image enregistrée dans data/uploads/
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/uploads/[file]">) {
  await connection();
  const { file } = await ctx.params;
  const match = /^([a-f0-9-]+)\.(jpg|png|webp)$/.exec(file); // empêche toute traversée de dossier
  if (!match) return new Response("Introuvable", { status: 404 });
  try {
    const data = await fs.readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[match[2]], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
