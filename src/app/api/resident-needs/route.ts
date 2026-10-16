import { vacancyHandler } from "@/lib/vacancy-http";
import { DAILY_RESIDENT_SUPPORT_LIMIT, expressResidentNeed, listResidentNeeds, residentSupportsRemaining } from "@/lib/resident-needs";

export async function GET() {
  return vacancyHandler((userId) => ({ needs: listResidentNeeds(userId || null), dailyLimit: DAILY_RESIDENT_SUPPORT_LIMIT, remaining: userId ? residentSupportsRemaining(userId) : null }), { public: true });
}
export async function POST(req: Request) {
  return vacancyHandler(async (userId) => expressResidentNeed(userId, await req.json().catch(() => null)), { status: 201 });
}
