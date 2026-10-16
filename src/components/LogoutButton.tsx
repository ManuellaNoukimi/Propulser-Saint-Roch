"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";

/** « Se déconnecter », sur la page de son propre compte (résident·e : /moi ; entreprise : sa page /u/:id). */
export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { logout } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className={`ig-btn-secondary text-sm ${className}`}
      onClick={async () => { setBusy(true); await logout(); toast("Tu es déconnecté·e"); router.push("/"); }}>
      <LogOut size={16} /> {busy ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
