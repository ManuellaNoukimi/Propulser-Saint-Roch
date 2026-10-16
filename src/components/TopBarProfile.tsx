"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { isEstablishment } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { Avatar } from "./Avatar";
import { PendingDot } from "./ProfileActivityLink";

// Téléphone : le profil est en haut à droite de l'en-tête (16 oct., Danny) ; l'Annuaire prend sa place dans le menu du bas.
export function TopBarProfile() {
  const { user } = useSession();
  const pathname = usePathname();
  const href = user ? (isEstablishment(user.accountType) ? `/u/${user.id}` : "/moi") : "/connexion";
  const active = pathname === href || pathname.startsWith("/moi");
  return (
    <Link href={href} aria-label={user ? "Mon profil" : "Se connecter"} aria-current={active ? "page" : undefined}
      className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-soft active:scale-90">
      {user ? (
        <span className={`relative rounded-full ${active ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : ""}`}>
          <Avatar user={user} size={30} />
          {!isEstablishment(user.accountType) && <PendingDot />}
        </span>
      ) : (
        <LogIn size={22} strokeWidth={1.8} />
      )}
    </Link>
  );
}
