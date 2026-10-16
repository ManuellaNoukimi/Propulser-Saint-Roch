"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isEstablishment } from "@/lib/constants";
import { useSession } from "@/lib/session";

// Un seul espace par type de compte (demande de Danny, 16 oct.) :
// - résident·e, invité·e ou visiteur : Vie Saint-Roch (tout, y compris les publications des entreprises) ;
// - entreprise (commerce, entreprise, organisme) : l'espace Entreprises seulement (publications et activités des
//   entreprises, entreprises similaires, connexions). Elle ne voit pas les activités des résident·e·s.
// Les pages de l'autre espace renvoient vers le sien.

// Pages permises à un compte entreprise (le reste est Vie Saint-Roch)
const BUSINESS_PAGES = ["/entreprises", "/annuaire", "/u", "/p", "/moi", "/connexion", "/inscription", "/sdc", "/lancer"];
const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export const homeFor = (accountType: string | null | undefined) => (accountType && isEstablishment(accountType) ? "/entreprises" : "/vie");

export function SpaceGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  useEffect(() => {
    if (loading || !pathname || pathname === "/") return;
    const business = !!user && isEstablishment(user.accountType);
    if (business && !BUSINESS_PAGES.some((p) => under(pathname, p))) router.replace("/entreprises");
    else if (!business && under(pathname, "/entreprises")) router.replace("/vie");
  }, [pathname, user, loading, router]);
  return null;
}

/** Page « / » : chacun arrive dans son espace. */
export function HomeRedirect() {
  const router = useRouter();
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading) router.replace(homeFor(user?.accountType));
  }, [user, loading, router]);
  return <div className="p-10 text-center text-muted">Chargement…</div>;
}
