"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Check, HandHeart, MapPin, Store } from "lucide-react";
import { categoryOf } from "@/lib/constants";
import { dateParts } from "@/lib/format";
import { IDEA_TAGS, type IdeaTagId } from "@/lib/quartier";
import { loginHref, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { Idea } from "@/lib/types";

// Problème 2 : « Ça se passe à Saint-Roch » — un seul endroit pour tout ce qui se passe près de chez soi.

const DAY = 86_400_000;
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Étiquettes déduites de l'activité : Gratuit, En famille, Le midi, Le soir, Viens seul·e. */
export function tagsOf(idea: Pick<Idea, "title" | "description" | "startsAt" | "category">): IdeaTagId[] {
  const t = fold(`${idea.title} ${idea.description}`);
  const tags: IdeaTagId[] = [];
  if (/gratuit|offert|sans frais|ouvert a tou/.test(t) || ["benevolat", "environnement"].includes(idea.category)) tags.push("gratuit");
  if (/enfant|famille|parents|bebe|poussette/.test(t)) tags.push("famille");
  if (idea.startsAt) {
    const h = new Date(idea.startsAt).getHours();
    if (h >= 11 && h < 14) tags.push("midi");
    if (h >= 17) tags.push("soir");
  }
  if (/seul|nouveau|arriv|bienvenue/.test(t)) tags.push("seul");
  return tags;
}

const FILTERS = [
  { id: "tout", label: "Tout", emoji: "✨" },
  { id: "maintenant", label: "En ce moment", emoji: "🔴" },
  { id: "soir", label: "Ce soir", emoji: "🌙" },
  { id: "weekend", label: "Ce week-end", emoji: "🎉" },
  { id: "gratuit", label: "Gratuit", emoji: "🆓" },
  { id: "famille", label: "Avec les enfants", emoji: "👨‍👩‍👧" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function matches(idea: Idea, f: FilterId, now: number): boolean {
  const start = new Date(idea.startsAt!).getTime();
  const d = new Date(idea.startsAt!);
  const today = new Date(now);
  switch (f) {
    case "tout": return true;
    case "maintenant": return start <= now + 3_600_000 && start >= now - 2 * 3_600_000;
    case "soir": return d.toDateString() === today.toDateString() && d.getHours() >= 17;
    case "weekend": return (d.getDay() === 0 || d.getDay() === 6) && start - now < 7 * DAY;
    case "gratuit": return tagsOf(idea).includes("gratuit");
    case "famille": return tagsOf(idea).includes("famille");
  }
}

// « Nouveau dans le quartier » : nouveautés et promos des commerces (exemples de démo, comptes fictifs)
const NEWS = [
  { who: "Bistro du Faubourg", emoji: "🍂", title: "Nouveau menu d'automne", detail: "Courge rôtie et tarte aux pommes du quartier.", href: "/explorer" },
  { who: "Boutique Friperie", emoji: "🧥", title: "Arrivage de manteaux d'hiver", detail: "Plus de 60 manteaux dès samedi 10 h.", href: "/explorer" },
  { who: "Café du Coin", emoji: "☕", title: "2e café à moitié prix", detail: "Cet après-midi, de 14 h à 16 h.", href: "/midi" },
  { who: "Vitrine éphémère", emoji: "🖼️", title: "Expo des jeunes artistes", detail: "Un local vide devient une galerie.", href: "/vitrines" },
];

export function Happening({ ideas }: { ideas: Idea[] | null }) {
  const [filter, setFilter] = useState<FilterId>("tout");
  const [now] = useState(() => Date.now());

  const upcoming = useMemo(
    () =>
      (ideas ?? [])
        .filter((i) => i.startsAt && new Date(i.startsAt).getTime() > now - 2 * 3_600_000 && new Date(i.startsAt).getTime() < now + 14 * DAY)
        .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime()),
    [ideas, now],
  );
  const live = upcoming.filter((i) => matches(i, "maintenant", now));
  const list = upcoming.filter((i) => matches(i, filter, now));
  const weekday = new Date(now).getDay();
  const isWorkday = weekday >= 1 && weekday <= 5;

  return (
    <section aria-labelledby="ca-se-passe" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-muted"><span className="live-dot" /> Problème 2 · En direct du quartier</p>
          <h2 id="ca-se-passe" className="text-xl font-bold tracking-tight md:text-2xl">Ça se passe à Saint-Roch</h2>
        </div>
        <Link href="/evenements" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-ig-blue">Tout l&apos;agenda <ArrowRight size={14} /></Link>
      </div>

      {/* Le Midi Complice (problème 3), du lundi au vendredi */}
      {isWorkday && (
        <Link href="/midi" className="midi-banner group flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/80 text-2xl shadow-sm">🍽️</span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Aujourd&apos;hui midi à Saint-Roch</span>
            <span className="block truncate text-xs text-muted">Table complice au café · Pétanque express · -15 % chez 4 commerces</span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-ig-blue sm:inline-flex">Voir <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span>
        </Link>
      )}

      <div role="group" aria-label="Filtrer les activités" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {FILTERS.map((f) => {
          const on = f.id === filter;
          const count = f.id === "maintenant" ? live.length : null;
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => setFilter(f.id)}
              className={`min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-medium transition active:scale-95 ${on ? "border-fg bg-fg text-bg shadow-sm" : "border-line bg-bg hover:border-muted"}`}>
              {f.emoji} {f.label}{count ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {!ideas ? (
        <div className="no-scrollbar flex gap-3 overflow-hidden">{[0, 1, 2].map((k) => <div key={k} className="h-[214px] w-[280px] shrink-0 animate-pulse rounded-2xl bg-hov" />)}</div>
      ) : list.length === 0 ? (
        <div className="surface-card px-6 py-8 text-center text-sm text-muted">
          {filter === "maintenant" ? "Rien en ce moment… " : "Rien pour ce filtre cette semaine… "}
          <Link href="/lancer" className="font-semibold text-ig-blue">et si tu lançais quelque chose ?</Link>
        </div>
      ) : (
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:px-0">
          {list.map((i) => <EventCard key={i.id} idea={i} live={live.includes(i)} />)}
        </ul>
      )}

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Store size={16} className="text-ig-blue" /> Nouveau dans le quartier</h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NEWS.map((n) => (
            <li key={n.title}>
              <Link href={n.href} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-bg p-3.5 transition hover:-translate-y-0.5 hover:border-ig-blue/40 hover:shadow-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft text-xl">{n.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{n.who}</span>
                  <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                  <span className="block text-xs text-muted">{n.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function EventCard({ idea, live }: { idea: Idea; live: boolean }) {
  const router = useRouter();
  const { user } = useSession();
  const [going, setGoing] = useState(false);
  const [helping, setHelping] = useState(false);
  const p = dateParts(idea.startsAt!);
  const tags = tagsOf(idea);
  const cat = categoryOf(idea.category);

  async function join(contribution: "participer" | "benevole") {
    if (!user) return router.push(loginHref());
    const res = await fetch(`/api/ideas/${idea.id}/complices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contribution, message: "" }),
    }).catch(() => null);
    if (!res || (!res.ok && res.status !== 409)) return toast("Impossible pour l'instant. Réessaie.");
    if (contribution === "participer") {
      setGoing(true);
      toast("📅 C'est noté, tu y vas !");
    } else {
      setHelping(true);
      toast("💪 L'organisateur a reçu ton offre de coup de main");
    }
  }

  return (
    <li className="w-[280px] shrink-0 snap-start">
      <article className="flex h-full flex-col rounded-2xl border border-line bg-bg p-4 transition hover:border-ig-blue/30 hover:shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-[58px] w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-soft leading-none">
            <span className="text-[9px] font-bold text-ig-red">{p.month}</span>
            <span className="mt-1 text-[22px] font-bold">{p.day}</span>
          </span>
          <div className="min-w-0 flex-1">
            {live && <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-ig-red/10 px-2 py-0.5 text-[10px] font-bold text-ig-red"><span className="live-dot" /> En ce moment</span>}
            <Link href={`/p/${idea.id}`} className="line-clamp-2 text-sm font-bold leading-snug hover:text-ig-blue">{cat?.emoji} {idea.title}</Link>
          </div>
        </div>
        <p className="mt-2.5 text-xs capitalize text-muted">{p.weekday} · {p.time}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {idea.place}</p>
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => {
              const tag = IDEA_TAGS.find((x) => x.id === t)!;
              return <span key={t} className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-medium">{tag.emoji} {tag.label}</span>;
            })}
          </div>
        )}
        <div className="mt-auto flex gap-2 pt-3.5">
          <button type="button" onClick={() => join("participer")} disabled={going} aria-pressed={going}
            className={`min-h-10 flex-1 rounded-xl text-xs font-semibold transition active:scale-95 ${going ? "bg-ig-blue/10 text-ig-blue" : "ig-btn"}`}>
            {going ? <span className="inline-flex items-center gap-1"><Check size={14} /> J&apos;y vais</span> : "J'y vais"}
          </button>
          <button type="button" onClick={() => join("benevole")} disabled={helping} aria-pressed={helping} aria-label="Je donne un coup de main"
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition active:scale-95 ${helping ? "border-ig-green/40 bg-ig-green/10 text-[#2f8a12]" : "border-line hover:bg-soft"}`}>
            {helping ? <Check size={14} /> : <HandHeart size={14} />} Coup de main
          </button>
        </div>
      </article>
    </li>
  );
}
