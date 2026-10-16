import { vacancyHandler } from "@/lib/vacancy-http";
import { supportResidentNeed, withdrawResidentSupport } from "@/lib/resident-needs";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return vacancyHandler(async (userId) => supportResidentNeed(userId, (await ctx.params).id, await req.json().catch(() => null)));
}
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return vacancyHandler(async (userId) => withdrawResidentSupport(userId, (await ctx.params).id));
}
