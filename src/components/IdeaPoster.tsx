import { HandHeart, HeartHandshake, Megaphone, Palette, Sprout, Store, Volleyball } from "lucide-react";
import { categoryOf } from "@/lib/constants";
import { CATEGORY_PALETTES } from "@/lib/ui";
import type { Idea } from "@/lib/types";

const ICONS = { culturel: Palette, communautaire: HeartHandshake, benevolat: HandHeart, recrutement: Megaphone, sport: Volleyball, commerce: Store, environnement: Sprout };

/** Aperçu d’affiche : papier pastel, titre composé et symbole de la catégorie. */
export function IdeaPoster({ idea, compact = false }: { idea: Pick<Idea, "title" | "category">; compact?: boolean }) {
  const category = categoryOf(idea.category);
  const palette = CATEGORY_PALETTES[idea.category];
  const Icon = ICONS[idea.category];

  return (
    <div className={`idea-poster ${compact ? "idea-poster--compact" : ""}`} style={{ background: palette.background, color: palette.ink }}>
      <span className="relative z-10 self-start rounded-md border border-current/15 px-2 py-1 text-[8px] font-semibold uppercase tracking-[.12em]">{category?.label}</span>
      <Icon aria-hidden strokeWidth={.9} className={`pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 -rotate-12 opacity-[.12] ${compact ? "h-36 w-36" : "h-64 w-64"}`} />
      <p className={`poster-title relative z-10 max-w-[90%] font-bold tracking-tight ${compact ? "line-clamp-3 leading-[1.12]" : "line-clamp-4 text-[clamp(28px,4vw,42px)] leading-[1.1]"}`}>{idea.title}</p>
      <span className="relative z-10 flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[.18em] opacity-60"><span className="h-px w-5 bg-current" /> À faire ensemble · Saint-Roch</span>
    </div>
  );
}
