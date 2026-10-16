import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { BUSINESS_ONLY, isEstablishment } from "@/lib/constants";
import { DOMAINS, domainsFor, type DomainId } from "@/lib/domains";

// GET /api/collaborer?domaines=ti,construction&mode=tous
// Les vraies entreprises de Saint-Roch qui partagent au moins un des domaines choisis (par défaut : ceux du compte),
// ou tous les domaines choisis (mode=tous). Les plus proches de toi d'abord : nombre de domaines en commun,
// puis les comptes Complices (contactables), puis l'ordre alphabétique.
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (!isEstablishment(me.account_type)) return Response.json(BUSINESS_ONLY, { status: 403 });

  const mine = domainsFor({ name: me.display_name, description: me.description, sector: me.sector, accountType: me.account_type });
  const valid = new Set<string>(DOMAINS.map((d) => d.id));
  const asked = (req.nextUrl.searchParams.get("domaines") ?? "").split(",").map((d) => d.trim()).filter((d) => valid.has(d)) as DomainId[];
  const selected = asked.length ? asked : mine;
  const all = req.nextUrl.searchParams.get("mode") === "tous";

  const companies = (await listCompanies()).filter((c) => c.accountId !== me.id);
  const counts = Object.fromEntries(DOMAINS.map((d) => [d.id, companies.filter((c) => c.domains.includes(d.id)).length]));
  const results = companies
    .map((c) => ({ ...c, shared: c.domains.filter((d) => selected.includes(d)) }))
    .filter((c) => (all ? c.shared.length === selected.length && selected.length > 0 : c.shared.length > 0))
    .sort((a, b) => b.shared.length - a.shared.length || Number(!!b.accountId) - Number(!!a.accountId) || a.name.localeCompare(b.name, "fr"));

  return Response.json({ mine, selected, mode: all ? "tous" : "un", counts, total: companies.length, results },
    { headers: { "Cache-Control": "private, no-store" } });
}
