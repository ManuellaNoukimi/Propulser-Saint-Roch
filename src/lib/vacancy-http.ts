import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { getCurrentUser, NOT_LOGGED_IN } from "./auth";
import { VacancyError, isSdc } from "./vacancies";

export function vacancyJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
/** Les erreurs inattendues restent des erreurs serveur ; seules les erreurs métier sont publiques. */
function validSdcKey(key: string | null | undefined) {
  const secret = process.env.COMPLICES_SDC_API_KEY;
  if (!secret || secret.length < 32 || !key) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(secret), hash(key));
}

export async function vacancyHandler(action: (userId: string) => unknown | Promise<unknown>, options: { public?: boolean; sdc?: boolean; sdcKey?: string | null; status?: number } = {}) {
  try {
    const me = await getCurrentUser();
    if (!me && !options.public) return vacancyJson(NOT_LOGGED_IN, 401);
    // La connexion démo ne vérifie pas toujours les mots de passe : le nom du compte SDC ne suffit pas.
    if (options.sdc && (!me || !isSdc(me.id) || !validSdcKey(options.sdcKey))) return vacancyJson({ error: "Accès réservé à la SDC.", code: "sdc_required" }, 403);
    return vacancyJson(await action(me?.id ?? ""), options.status ?? 200);
  } catch (error) {
    if (error instanceof ZodError) return vacancyJson({ error: error.issues[0]?.message ?? "Données invalides.", code: "validation" }, 400);
    if (error instanceof VacancyError) return vacancyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }
}
