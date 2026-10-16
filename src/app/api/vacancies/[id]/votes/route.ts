import { vacancyHandler } from "@/lib/vacancy-http";
import { recordVacancyVote } from "@/lib/vacancies";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return vacancyHandler(async (userId) => {
    const { id } = await ctx.params;
    return { vote: recordVacancyVote(userId, id, await req.json().catch(() => null)) };
  }, { status: 201 });
}
