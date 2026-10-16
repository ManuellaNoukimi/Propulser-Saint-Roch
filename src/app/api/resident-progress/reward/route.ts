import { vacancyHandler } from "@/lib/vacancy-http";
import { claimResidentReward } from "@/lib/resident-progress";
export async function POST() {
  return vacancyHandler(claimResidentReward);
}
