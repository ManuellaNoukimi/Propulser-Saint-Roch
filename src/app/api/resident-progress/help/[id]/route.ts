import { vacancyHandler } from "@/lib/vacancy-http";
import { confirmResidentHelp } from "@/lib/resident-progress";
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return vacancyHandler((userId) => confirmResidentHelp(userId, id));
}
