import { getCurrentUser } from "@/lib/auth";
import { isSdc } from "@/lib/vacancies";

// GET /api/sdc/me : { sdc: true } si le compte connecté est un compte SDC (COMPLICES_SDC_USER_IDS). Sert au menu.
export async function GET() {
  const me = await getCurrentUser();
  return Response.json({ sdc: !!me && isSdc(me.id) }, { headers: { "Cache-Control": "private, no-store" } });
}
