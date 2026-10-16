import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { BUSINESS_ONLY, isEstablishment } from "@/lib/constants";
import { businessDashboard } from "@/lib/dashboard";

// GET /api/tableau : tableau de bord du commerce, de l'entreprise ou de l'organisme connecté.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (!isEstablishment(me.account_type)) return Response.json(BUSINESS_ONLY, { status: 403 });
  return Response.json(businessDashboard(me), { headers: { "Cache-Control": "private, no-store" } });
}
