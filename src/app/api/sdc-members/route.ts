import { vacancyHandler } from "@/lib/vacancy-http";
import { listSdcMembers } from "@/lib/sdc-members";

export async function GET() {
  return vacancyHandler(() => listSdcMembers(), { public: true });
}
