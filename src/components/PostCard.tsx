"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Copy, EyeOff, MapPin, Send, Users } from "lucide-react";
import { businessPostTypeOf, categoryOf } from "@/lib/constants";
import { dateParts, formatDate } from "@/lib/format";
import { publicationSourceOf } from "@/lib/quartier";
import { toast } from "@/lib/toast";
import { loginHref, useSession } from "@/lib/session";
import type { Idea } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ProfileLink } from "./ProfileLink";
import { IdeaPoster } from "./IdeaPoster";
import { JoinSheet } from "./JoinSheet";
import { JoinedTag } from "./JoinedTag";
import { usePostActions } from "./usePostActions";

export function PostCard({ idea }: { idea: Idea }) {
  const router = useRouter();
  const { user } = useSession();
  const { share } = usePostActions(idea);
  const [joinOpen, setJoinOpen] = useState(false);
  const [complices, setComplices] = useState(idea.complicesCount);
  const [joined, setJoined] = useState<string[]>(idea.myContributions ?? []); // « Inscrit·e » si non vide
  const category = categoryOf(idea.category);
  const date = idea.startsAt ? dateParts(idea.startsAt) : null;
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
    <article className="idea-card publication-card group/card flex h-full min-w-0 flex-col overflow-hidden border border-line bg-bg">
      <div className="relative">
        <Link href={`/p/${idea.id}`} aria-label={`Découvrir : ${idea.title}`} className="publication-preview group/preview relative block overflow-hidden bg-soft">
          {idea.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={idea.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : <IdeaPoster idea={idea} compact />}
          {idea.images.length > 1 && <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 text-xs text-white"><Copy size={13} /> {idea.images.length} photos</span>}
          <span className="publication-preview-arrow absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-lg bg-white text-[#1f3a4d] opacity-0 shadow-sm transition group-hover/preview:opacity-100 group-focus-visible/preview:opacity-100"><ArrowUpRight size={18} /></span>
        </Link>
      </div>

      <div className="publication-body flex flex-1 flex-col">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="publication-tag"> {category?.label}</span>
          {kind && <span className="publication-tag publication-tag-secondary"> {kind.label}</span>}
        </div>
        <div className="flex items-start gap-3">
          <div className="publication-date" aria-hidden="true">
            {date ? <><span>{date.month}</span><strong>{date.day}</strong></> : <CalendarDays size={23} />}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/p/${idea.id}`} className="hover:text-ig-blue"><h2 className="publication-title line-clamp-2">{idea.title}</h2></Link>
            <p className="mt-2 text-sm leading-relaxed text-muted">{formatDate(idea.startsAt)}</p>
          </div>
        </div>
        <p className="publication-description mt-4 line-clamp-2 text-muted">{idea.description || "Une idée pour faire bouger Saint-Roch."}</p>
        <div className="publication-metadata mb-5 mt-4 text-muted">
          <p className="flex min-w-0 items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /><span title={idea.place} className="line-clamp-2 min-w-0">{idea.place}</span></p>
          <Link href={`/p/${idea.id}#complices`} className="inline-flex w-fit items-center gap-1.5 hover:text-fg"><Users size={15} /><span className="font-semibold tabular-nums">{complices}</span><span>complice{complices > 1 ? "s" : ""}</span></Link>
        </div>

        <div className="publication-author mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
          <div className="min-w-0 flex-1">
            <ProfileLink user={idea.organizer} className="flex min-w-0 items-center gap-2.5 hover:text-ig-blue"><Avatar user={idea.organizer} size={28} /><span title={idea.organizer.displayName} className="truncate text-sm font-medium">{idea.organizer.displayName}</span></ProfileLink>
            {imported && <span className="mt-1 block text-xs text-muted">{publicationSourceOf(idea.source)?.label}</span>}
          </div>
          {mine && imported && (
            <button type="button" onClick={hide} aria-label="Masquer cette publication" title="Masquer"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-soft hover:text-fg"><EyeOff size={17} /></button>
          )}
        </div>

        <div className="publication-actions mt-4 flex items-center gap-2">
          {mine ? <Link href={`/p/${idea.id}#complices`} className="ig-btn-secondary min-w-0 flex-1">Voir mes complices <ArrowUpRight size={16} /></Link> : joined.length ? <JoinedTag ideaId={idea.id} contributions={joined} onLeft={(n) => { setJoined([]); setComplices((c) => Math.max(0, c - n)); }} /> : <button type="button" onClick={() => user ? setJoinOpen(true) : router.push(loginHref())} className="ig-btn min-w-0 flex-1">Je me propose <ArrowUpRight size={16} /></button>}
          <button type="button" onClick={share} aria-label="Partager cette idée" title="Partager cette idée" className="publication-share grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:bg-soft hover:text-fg"><Send size={17} /></button>
        </div>

      </div>
      <JoinSheet ideaId={idea.id} title={idea.title} needs={idea.needs} open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={(c) => { setComplices((count) => count + 1); setJoined((j) => [...j, c]); }} />
    </article>
  );
}
