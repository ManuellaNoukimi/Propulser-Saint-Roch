import { sdcRoute, verifiedAddresses } from "@/lib/sdc-admin";
import { getSdcVacancies } from "@/lib/vacancies";

// GET /api/sdc/vitrines : demande par local (votes, visites promises, demandes d'occupation avec le nom du demandeur).
export async function GET() {
  return sdcRoute((sdcId) => ({ ...getSdcVacancies(sdcId), addresses: verifiedAddresses() }));
}
