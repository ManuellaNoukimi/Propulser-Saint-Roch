import { vacancyHandler } from "@/lib/vacancy-http";
import {
  getResidentProgress,
  updateResidentProgressSettings,
} from "@/lib/resident-progress";
export async function GET() {
  return vacancyHandler(getResidentProgress);
}
export async function PATCH(req: Request) {
  return vacancyHandler(async (id) =>
    updateResidentProgressSettings(id, await req.json().catch(() => null)),
  );
}
