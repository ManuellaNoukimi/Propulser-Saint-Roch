import { vacancyHandler } from "@/lib/vacancy-http";
import { redeemResidentMidi } from "@/lib/resident-progress";
export async function POST(req: Request) {
  return vacancyHandler(async (id) =>
    redeemResidentMidi(id, await req.json().catch(() => null)),
  );
}
