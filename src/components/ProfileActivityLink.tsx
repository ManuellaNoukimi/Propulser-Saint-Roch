"use client";

import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { usePendingInvites } from "@/lib/invites";

// « Activité » (invitations reçues et réponses) rangée dans le profil, et non plus dans la navigation (demande de Danny, 16 oct.).
export function ProfileActivityLink({ card = false }: { card?: boolean }) {
  const { pending } = usePendingInvites();
  const count = pending > 0 && (
    <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-ig-red px-1.5 text-[11px] font-bold text-white">{pending}</span>
  );
  if (!card) {
    return (
      <Link href="/activite" className="ig-btn-secondary text-sm" aria-label={pending ? `Activité : ${pending} invitation${pending > 1 ? "s" : ""} en attente` : "Activité"}>
        <Bell size={16} aria-hidden /> Activité {count}
      </Link>
    );
  }
  return (
    <Link href="/activite" className="flex items-center gap-3 rounded-lg border border-line bg-bg px-4 py-3 transition hover:bg-soft">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-soft"><Bell size={20} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Activité</span>
        <span className="block text-sm text-muted">{pending ? `${pending} invitation${pending > 1 ? "s" : ""} en attente` : "Tes invitations et les réponses à tes idées"}</span>
      </span>
      {count}
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

/** Pastille du nombre d'invitations en attente, posée sur l'icône du profil dans la navigation. */
export function PendingDot() {
  const { pending } = usePendingInvites();
  if (!pending) return null;
  return (
    <span className="absolute -right-1.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ig-red px-1 text-[10px] font-bold text-white ring-2 ring-bg" aria-hidden>{pending}</span>
  );
}
