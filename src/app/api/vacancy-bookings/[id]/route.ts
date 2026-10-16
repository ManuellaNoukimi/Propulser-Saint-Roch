import { vacancyHandler } from "@/lib/vacancy-http";
import { confirmationSchema, confirmVacancyBooking } from "@/lib/vacancies";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return vacancyHandler(async (sdcId) => {
    confirmationSchema.parse(await req.json().catch(() => null));
    const { id } = await ctx.params;
    return { booking: confirmVacancyBooking(sdcId, id) };
  }, { sdc: true, sdcKey: req.headers.get("x-sdc-key") });
}
