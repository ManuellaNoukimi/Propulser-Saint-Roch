import { z } from "zod";
import { sdcRoute, verifyVacancyAddress } from "@/lib/sdc-admin";

const schema = z.object({ vacancyId: z.string().min(1).max(120), civic: z.string().max(10) }).strict();

// POST /api/sdc/vitrines/adresse { vacancyId, civic } : la SDC indique le numéro civique d'un local (adresse officielle de la Ville).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return sdcRoute((sdcId) => {
    const { vacancyId, civic } = schema.parse(body);
    return verifyVacancyAddress(sdcId, vacancyId, civic);
  });
}
