import Link from "next/link";
import { isEstablishment } from "@/lib/constants";
import type { PublicUser } from "@/lib/types";

/** Lien vers la page publique d'une ENTREPRISE. Un·e résident·e n'a pas de page : on affiche seulement son nom. */
export function ProfileLink({ user, className, children }: { user: Pick<PublicUser, "id" | "accountType">; className?: string; children: React.ReactNode }) {
  if (!isEstablishment(user.accountType)) return <span className={className}>{children}</span>;
  return <Link href={`/u/${user.id}`} className={className}>{children}</Link>;
}
