"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePendingInvites } from "@/lib/invites";

/** Cloche « Activité » avec la pastille du nombre d'invitations en attente. */
export function ActivityBell({ withLabel = false, active = false }: { withLabel?: boolean; active?: boolean }) {
  const { pending } = usePendingInvites();
  return (
    <Link href="/activite" aria-label={pending ? `Activité : ${pending} invitation${pending > 1 ? "s" : ""} en attente` : "Activité"} title="Activité" aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-10 min-w-10 items-center justify-center gap-3 rounded-xl transition ${withLabel ? `min-h-12 p-3 xl:justify-start ${active ? "bg-soft font-bold" : "hover:bg-soft"}` : "rounded-full hover:bg-soft"}`}>
      <span className="relative">
        <Bell size={withLabel ? 24 : 22} strokeWidth={active ? 2.5 : 1.8} className={pending ? "bell-ring" : ""} />
        {pending > 0 && <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ig-red px-1 text-[10px] font-bold text-white ring-2 ring-bg">{pending}</span>}
      </span>
      {withLabel && <span className="hidden text-[15px] xl:inline">Activité</span>}
    </Link>
  );
}
