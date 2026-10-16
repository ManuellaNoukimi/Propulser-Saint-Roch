import { z } from "zod";
import { sdcRoute } from "@/lib/sdc-admin";
import { confirmVacancyBooking } from "@/lib/vacancies";

const schema = z.object({ bookingId: z.string().min(1).max(80) }).strict();

// POST /api/sdc/vitrines/confirmer { bookingId } : la SDC confirme une occupation (crée l'activité dans le fil).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return sdcRoute((sdcId) => ({ booking: confirmVacancyBooking(sdcId, schema.parse(body).bookingId) }));
}
