import { vacancyHandler } from "@/lib/vacancy-http";
import { getResidentPointSummary } from "@/lib/resident-progress";
export async function GET() {
  return vacancyHandler(getResidentPointSummary);
}
