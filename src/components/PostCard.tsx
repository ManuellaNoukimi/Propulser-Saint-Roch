"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Copy, EyeOff, MapPin, Send, Users } from "lucide-react";
import { businessPostTypeOf, categoryOf } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { publicationSourceOf } from "@/lib/quartier";
import { toast } from "@/lib/toast";
import { loginHref, useSession } from "@/lib/session";
import type { Idea } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ProfileLink } from "./ProfileLink";
import { IdeaPoster } from "./IdeaPoster";
import { JoinSheet } from "./JoinSheet";
import { usePostActions } from "./usePostActions";

export function PostCard({ idea }: { idea: Idea }) {
  const router = useRouter();
  const { user } = useSession();
  const { share } = usePostActions(idea);
  const [joinOpen, setJoinOpen] = useState(false);
  const [complices, setComplices] = useState(idea.complicesCount);
  const category = categoryOf(idea.category);
  const mine = user?.id === idea.organizer.id;
  const [hidden, setHidden] = useState(false);
  const kind = businessPostTypeOf(idea.postType); // F3 : promo / nouveauté… (publications d'entreprise)
  const imported = idea.source !== "manuel"; // F3 : arrivée d'une page liée

  // F3 : masquer une publication importée qu'on ne veut pas voir dans Complices.
  async function hide() {
    const r = await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: true }),
    });
    if (r.ok) {
      setHidden(true);
      toast("Publication masquée");
    } else toast("Impossible de masquer cette publication.");
  }

  if (hidden) return null;

  return (
    <article className="idea-card group/card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-bg">
      <div className="relative m-2.5 mb-0">
        <Link href={`/p/${idea.id}`} aria-label={`Découvrir : ${idea.title}`} className="group/preview relative block aspect-[16/10] overflow-hidden rounded-xl bg-soft">
          {idea.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={idea.images[0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover/preview:scale-105" />
          ) : <IdeaPoster idea={idea} compact />}
          {idea.images[0] && <span className="absolute left-3 top-3 max-w-[calc(100%-64px)] truncate rounded-md border border-white/30 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#252137]">{category?.emoji} {category?.label}</span>}
          {idea.images.length > 1 && <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white"><Copy size={11} /> {idea.images.length} photos</span>}
          <span className="absolute bottom-3 right-3 grid h-8 w-8 translate-y-1 place-items-center rounded-lg bg-white text-[#252137] opacity-0 shadow-sm transition group-hover/preview:translate-y-0 group-hover/preview:opacity-100 group-focus-visible/preview:translate-y-0 group-focus-visible/preview:opacity-100"><ArrowUpRight size={18} /></span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
        <Link href={`/p/${idea.id}`} className="hover:text-ig-blue"><h2 className="line-clamp-2 min-h-[44px] text-[16px] font-bold leading-snug tracking-tight">{idea.title}</h2></Link>
        {kind && (
          <p className="mt-2"><span className="inline-flex items-center gap-1 rounded-md bg-soft px-2 py-0.5 text-[10px] font-semibold">{kind.emoji} {kind.label}</span></p>
        )}
        <p className="mt-1.5 line-clamp-1 min-h-[17px] text-[11px] leading-relaxed text-muted">{idea.description || "Une idée pour faire bouger Saint-Roch."}</p>

        <div className="mb-4 mt-3 space-y-1.5 text-[11px] text-muted">
          <p className="flex items-start gap-2"><CalendarDays size={14} className="mt-px shrink-0 text-ig-blue" /><span className="line-clamp-1">{formatDate(idea.startsAt)}</span></p>
          <div className="flex items-center gap-2"><MapPin size={14} className="shrink-0" /><span title={idea.place} className="min-w-0 flex-1 truncate">{idea.place}</span><Link href={`/p/${idea.id}#complices`} className="flex shrink-0 items-center gap-1 text-[10px] hover:text-fg"><Users size={12} /><span className="font-semibold tabular-nums">{complices}</span><span>complice{complices > 1 ? "s" : ""}</span></Link></div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-sep pt-3">
          <ProfileLink user={idea.organizer} className="flex min-w-0 flex-1 items-center gap-2 hover:text-ig-blue"><Avatar user={idea.organizer} size={23} /><span className="truncate text-[10px] font-medium">{idea.organizer.displayName}</span></ProfileLink>
          {imported && (
            <span className="shrink-0 text-[9px] text-muted">
              {publicationSourceOf(idea.source)?.label}
            </span>
          )}
          {mine && imported && (
            <button type="button" onClick={hide} aria-label="Masquer cette publication" title="Masquer"
              className="shrink-0 text-muted transition hover:text-fg"><EyeOff size={14} /></button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {mine ? <Link href={`/p/${idea.id}#complices`} className="ig-btn-secondary min-w-0 flex-1 text-xs">Voir mes complices <ArrowUpRight size={14} /></Link> : <button type="button" onClick={() => user ? setJoinOpen(true) : router.push(loginHref())} className="ig-btn min-w-0 flex-1 text-xs">Je me propose <ArrowUpRight size={14} /></button>}
          <button type="button" onClick={share} aria-label="Partager cette idée" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:bg-soft hover:text-fg"><Send size={16} /></button>
        </div>

      </div>
      <JoinSheet ideaId={idea.id} title={idea.title} needs={idea.needs} open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={() => setComplices((count) => count + 1)} />
    </article>
  );
}
