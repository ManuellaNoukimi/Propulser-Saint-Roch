import { vacancyHandler } from "@/lib/vacancy-http";
import { listMyVacancyBookings } from "@/lib/vacancies";

export async function GET() {
  return vacancyHandler((id) => ({ bookings: listMyVacancyBookings(id) }));
}
