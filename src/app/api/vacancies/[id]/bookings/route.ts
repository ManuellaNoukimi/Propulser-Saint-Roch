import { vacancyHandler } from "@/lib/vacancy-http";
import { VacancyError, bookingSchema, requestVacancyBooking } from "@/lib/vacancies";
import { moderate } from "@/lib/moderation";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return vacancyHandler(async (userId) => {
    const { id } = await ctx.params;
    const data = bookingSchema.parse(await req.json().catch(() => null));
    const result = moderate(data.title);
    if (!result.ok) throw new VacancyError(422, "moderation", result.reason);
    return { booking: requestVacancyBooking(userId, id, data) };
  }, { status: 201 });
}
