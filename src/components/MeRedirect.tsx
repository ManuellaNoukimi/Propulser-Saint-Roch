"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isEstablishment } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { AuthPrompt } from "./AuthPrompt";

// /moi → mon profil public (/u/<id>), ou invitation à se connecter.
export function MeRedirect() {
  const { user, loading } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(isEstablishment(user.accountType) ? `/u/${user.id}` : "/moi/modifier"); // pas de profil public pour les résident·e·s
  }, [user, router]);
  if (loading || user) return <div className="p-10 text-center text-muted">Chargement…</div>;
  return <AuthPrompt title="Ton profil complice" text="Crée ton compte pour publier, te proposer comme complice et gagner des badges." next="/moi" />;
}
