import { vacancyHandler } from "@/lib/vacancy-http";
import { publicResidentProgress } from "@/lib/resident-progress";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return vacancyHandler(() => publicResidentProgress(id), { public: true });
}
