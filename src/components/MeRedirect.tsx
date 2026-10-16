"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isResidentAccount } from "@/lib/resident-progress-options";
import { isEstablishment } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { ResidentProgressView } from "./ResidentProgressView";
import { AuthPrompt } from "./AuthPrompt";

// Les résidents ont un espace privé ; les établissements conservent leur page publique.
export function MeRedirect() {
  const { user, loading } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (user && !isResidentAccount(user.accountType)) router.replace(isEstablishment(user.accountType) ? `/u/${user.id}` : "/moi/modifier");
  }, [user, router]);
  if (loading || (user && !isResidentAccount(user.accountType))) return <div className="p-10 text-center text-muted">Chargement…</div>;
  if (user) return <ResidentProgressView key={user.id} />;
  return <AuthPrompt title="Ton profil complice" text="Crée ton compte pour publier, te proposer comme complice et gagner des badges." next="/moi" />;
}
