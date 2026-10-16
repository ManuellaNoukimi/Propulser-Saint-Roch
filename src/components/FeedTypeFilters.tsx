"use client";

import { Briefcase, LayoutGrid, PartyPopper, Tag, Users } from "lucide-react";
import { isEstablishment } from "@/lib/constants";
import type { Idea } from "@/lib/types";

// Filtres par type en tête du fil (comme le prototype HACKATHON26) : bien visibles, avec le nombre de publications.
export const FEED_TYPES = [
  { id: "tout", label: "Tout", icon: LayoutGrid, test: () => true },
  { id: "activites", label: "Activités", icon: PartyPopper, test: (i: Idea) => i.kind !== "entreprise" && i.category !== "recrutement" },
  { id: "promos", label: "Promos", icon: Tag, test: (i: Idea) => i.kind === "entreprise" && ["promo", "nouveaute", "offre"].includes(i.postType ?? "") },
  { id: "emplois", label: "Emplois et formations", icon: Briefcase, test: (i: Idea) => (i.kind === "entreprise" && i.postType === "emploi") || (i.kind !== "entreprise" && i.category === "recrutement") },
  { id: "voisins", label: "Entre voisins", icon: Users, test: (i: Idea) => i.kind !== "entreprise" && !isEstablishment(i.organizer.accountType) },
] as const;
export type FeedTypeId = (typeof FEED_TYPES)[number]["id"];

export const matchesType = (idea: Idea, type: FeedTypeId) => FEED_TYPES.find((t) => t.id === type)!.test(idea);

export function FeedTypeFilters({ value, onChange, ideas }: { value: FeedTypeId; onChange: (id: FeedTypeId) => void; ideas: Idea[] }) {
  return (
    <div role="group" aria-label="Type de publication" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
      {FEED_TYPES.map((t) => {
        const on = t.id === value;
        const Icon = t.icon;
        const count = ideas.filter((i) => t.test(i)).length;
        return (
          <button key={t.id} type="button" aria-pressed={on} onClick={() => onChange(t.id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 font-medium transition-colors ${on ? "border-fg bg-fg text-bg" : "border-line bg-bg hover:bg-soft"}`}>
            <Icon size={18} strokeWidth={1.75} aria-hidden /> {t.label}
            <span className={on ? "opacity-70" : "text-muted"}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
