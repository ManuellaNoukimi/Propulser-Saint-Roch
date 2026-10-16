"use client";

import { useEffect, useId, useState } from "react";
import { BadgeCheck, Briefcase, ChevronDown, HandHelping, MapPin, Megaphone, Sparkles, Tag } from "lucide-react";
import { isEstablishment } from "@/lib/constants";
import { dateParts } from "@/lib/format";
import { useNow } from "@/lib/now";
import type { Idea } from "@/lib/types";
import { IdeaPoster } from "./IdeaPoster";
import { PostCard } from "./PostCard";

// Fil en lignes compactes (comme le prototype HACKATHON26) : vignette, type en couleur, heure, titre, lieu ou auteur.
// Un clic déplie la carte complète avec ses boutons.

const KINDS = {
  activite: { label: "Activité", chip: "bg-ig-blue/15 text-fg", icon: Sparkles },
  promo: { label: "Promo", chip: "bg-ig-green text-white", icon: Tag },
  nouveaute: { label: "Nouveauté", chip: "bg-ig-green/20 text-fg", icon: Sparkles },
  emploi: { label: "Emploi", chip: "bg-fg text-bg", icon: Briefcase },
  offre: { label: "On offre", chip: "bg-soft text-fg border border-line", icon: HandHelping },
  annonce: { label: "Annonce", chip: "bg-soft text-fg border border-line", icon: Megaphone },
} as const;
type KindId = keyof typeof KINDS;

function kindOf(idea: Idea): KindId {
  if (idea.kind === "entreprise") return (idea.postType && idea.postType in KINDS ? idea.postType : "annonce") as KindId;
  return idea.category === "recrutement" ? "emploi" : "activite";
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function FeedList({ ideas }: { ideas: Idea[] }) {
  return (
    <ul aria-label="Fil du quartier">
      {ideas.map((idea) => <FeedRow key={idea.id} idea={idea} />)}
    </ul>
  );
}

function FeedRow({ idea }: { idea: Idea }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Garder la carte pendant le repli, puis masquer réellement le panneau.
  // Une réouverture rapide annule la fermeture différée sans perdre son état.
  useEffect(() => {
    if (open) return;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320;
    const timer = window.setTimeout(() => setCollapsed(true), delay);
    return () => window.clearTimeout(timer);
  }, [open]);
  const id = useId();
  const now = useNow();
  const k = KINDS[kindOf(idea)];
  const Icon = k.icon;
  const when = idea.startsAt ? dateParts(idea.startsAt) : null;
  // Aujourd'hui : l'heure seulement ; un autre jour : le jour et l'heure
  const whenLabel = when && (now && sameDay(new Date(idea.startsAt!), new Date(now)) ? when.time : `${when.weekday.slice(0, 3)}. ${when.day} ${when.month.toLowerCase()} · ${when.time}`);
  const business = idea.kind === "entreprise";
  const verified = isEstablishment(idea.organizer.accountType);

  return (
    <li className="feed-row border-b border-line last:border-b-0" data-open={open}>
      <button id={`${id}-trigger`} type="button" onClick={() => { setVisited(true); setCollapsed(false); setOpen((v) => !v); }} aria-expanded={open} aria-controls={`${id}-panel`}
        className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-soft/70 lg:px-2">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
          {idea.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={idea.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : business ? (
            <span className="grid h-full w-full place-items-center bg-soft text-muted" aria-hidden><Icon size={26} strokeWidth={1.75} /></span>
          ) : (
            <IdeaPoster idea={idea} compact />
          )}
          <span className="absolute bottom-1.5 left-1.5 grid h-7 w-7 place-items-center rounded-md bg-white text-[#1f3a4d]" aria-hidden><Icon size={16} /></span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold ${k.chip}`}>{k.label}</span>
            {whenLabel && <span className="text-sm font-semibold">{whenLabel}</span>}
          </span>
          <span className="mt-1 line-clamp-2 text-lg font-semibold leading-snug">{idea.title}</span>
          <span className="flex items-center gap-1.5 truncate text-muted">
            {idea.place && !business ? (
              <><MapPin size={16} className="shrink-0" aria-hidden /> <span className="truncate">{idea.place}</span></>
            ) : (
              <><span className="truncate">{idea.organizer.displayName}</span>{verified && <BadgeCheck size={16} className="shrink-0 text-ig-blue" aria-label="Compte vérifié" />}</>
            )}
          </span>
        </span>
        <ChevronDown size={20} className="feed-row-chevron shrink-0 text-muted" aria-hidden />
      </button>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} aria-hidden={!open} inert={!open} hidden={collapsed} className="feed-row-panel">
        <div className="feed-row-panel-inner">
          {visited && <div className="max-w-md pb-4 lg:px-2"><PostCard idea={idea} /></div>}
        </div>
      </div>
    </li>
  );
}
