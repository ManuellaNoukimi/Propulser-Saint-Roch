"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Plus, Search } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { useSession } from "@/lib/session";
import { Avatar } from "./Avatar";

const SHORTCUTS = [
  { href: "/evenements", label: "Agenda", icon: CalendarDays, color: "text-ig-blue" },
  { href: "/explorer", label: "Découvertes", icon: Search, color: "text-violet-500" },
  { href: "/signaler", label: "Mon quartier", icon: MapPin, color: "text-emerald-500" },
];

export function StoriesBar() {
  const { user } = useSession();
  return (
    <section aria-label="Raccourcis du quartier" className="border-y border-line bg-bg py-4 sm:rounded-2xl sm:border">
      <div className="mb-4 flex items-center justify-between px-4"><h2 className="text-xs font-semibold">Le quartier en un coup d&apos;œil</h2><Link href="/fonctionnalites" className="text-[11px] font-semibold text-muted hover:text-fg">Voir tout</Link></div>
      <div className="no-scrollbar flex items-start gap-4 overflow-x-auto px-4 pb-1">
        <Link href="/creer" className="group flex w-[64px] shrink-0 flex-col items-center gap-2">
          <span className="relative grid h-[62px] w-[62px] place-items-center">
            {user ? <Avatar user={user} size={54} /> : <span className="grid h-[58px] w-[58px] place-items-center rounded-full border border-dashed border-line bg-soft"><Plus size={24} className="text-muted" strokeWidth={1.5} /></span>}
            <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-bg bg-ig-blue text-white"><Plus size={11} strokeWidth={3} /></span>
          </span><span className="text-[11px] text-muted">Ton idée</span>
        </Link>
        {SHORTCUTS.map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href} className="group flex w-[64px] shrink-0 flex-col items-center gap-2">
            <span className="story-ring grid h-[62px] w-[62px] place-items-center rounded-full transition group-hover:scale-105 group-active:scale-95"><span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-bg"><span className={`grid h-[50px] w-[50px] place-items-center rounded-full bg-soft ${color}`}><Icon size={24} strokeWidth={1.6} /></span></span></span>
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        ))}
        <span className="my-3 h-10 w-px shrink-0 bg-line" aria-hidden />
        {FEATURES.filter((f) => f.status === "bientot").map((f) => (
          <Link key={f.slug} href={f.href} aria-label={`${f.label}, bientôt disponible`} className="group flex w-[64px] shrink-0 flex-col items-center gap-2">
            <span className="relative grid h-[62px] w-[62px] place-items-center rounded-full border border-line transition group-hover:border-muted group-active:scale-95"><span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-soft text-[25px]">{f.emoji}</span><span className="absolute -bottom-1 rounded-full border border-line bg-bg px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-muted">Bientôt</span></span>
            <span className="text-[11px] text-muted">{f.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
