import { vacancyHandler } from "@/lib/vacancy-http";
import { getSdcVacancies } from "@/lib/vacancies";

export async function GET(req: Request) {
  return vacancyHandler(getSdcVacancies, { sdc: true, sdcKey: req.headers.get("x-sdc-key") });
}
