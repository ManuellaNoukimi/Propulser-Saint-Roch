import { vacancyHandler } from "@/lib/vacancy-http";
import { checkinActivity, checkinResident } from "@/lib/resident-progress";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return vacancyHandler((userId) => checkinActivity(userId, id));
}
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return vacancyHandler((userId) => checkinResident(userId, id));
}
