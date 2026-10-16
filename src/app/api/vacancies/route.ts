import { vacancyHandler } from "@/lib/vacancy-http";
import { DAILY_VACANCY_VOTE_LIMIT, listVacancies } from "@/lib/vacancies";

export async function GET() {
  return vacancyHandler((id) => ({ vacancies: listVacancies(id || null), dailyVoteLimit: DAILY_VACANCY_VOTE_LIMIT }), { public: true });
}
