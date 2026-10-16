"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ExternalLink, HandHeart, Landmark, MapPin, Navigation, Store } from "lucide-react";
import type { CityEvent } from "@/lib/city-events";
import { businessPostTypeOf } from "@/lib/constants";
import { dateParts } from "@/lib/format";
import { useNow } from "@/lib/now";
import { IDEA_TAGS, type IdeaTagId } from "@/lib/quartier";
import { loginHref, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { confirmRegistration } from "@/lib/registration-confirmation";
import type { Idea } from "@/lib/types";
import { JoinedTag } from "./JoinedTag";
import { InterfaceIcon } from "@/components/InterfaceIcon";

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

type Datable = Pick<Idea, "title" | "description" | "category"> & { startsAt: string };
function matches(idea: Datable, f: FilterId, now: number): boolean {
  const start = new Date(idea.startsAt).getTime();
  const d = new Date(idea.startsAt);
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

// Vraies données seulement : événements de Saint-Roch du fichier Excel de la Ville (lu par le serveur)
// et dernières publications des comptes Entreprise de l'app (« Nouveau dans le quartier »).
type VilleEvent = CityEvent & { at: { lat: number; lng: number } | null };
const asDatable = (ev: VilleEvent): Datable => ({ title: ev.title, description: `${ev.description ?? ""} ${ev.cost ?? ""}`, category: "communautaire", startsAt: ev.startsAt });

export function Happening({ ideas }: { ideas: Idea[] | null }) {
  const [filter, setFilter] = useState<FilterId>("tout");
  const now = useNow() ?? 0; // 0 pendant le pré-rendu : la section se remplit dans le navigateur
  const [ville, setVille] = useState<VilleEvent[]>([]);
  const [news, setNews] = useState<Idea[] | null>(null);
  useEffect(() => {
    fetch("/api/evenements-ville", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events: VilleEvent[] }) => setVille(d.events))
      .catch(() => {});
    fetch("/api/entreprises", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d: { posts: Idea[] }) => setNews(d.posts.slice(0, 4)))
      .catch(() => setNews([]));
  }, []);
  const villeSoon = useMemo(
    () => ville.filter((ev) => { const t = new Date(ev.startsAt).getTime(); const end = ev.endsAt ? new Date(ev.endsAt).getTime() : t + 3 * 3_600_000; return end > now && t < now + 14 * DAY; }),
    [ville, now],
  );
  const villeList = villeSoon.filter((ev) => matches(asDatable(ev), filter, now));

  const upcoming = useMemo(
    () =>
      (ideas ?? [])
        .filter((i) => i.startsAt && new Date(i.startsAt).getTime() > now - 2 * 3_600_000 && new Date(i.startsAt).getTime() < now + 14 * DAY)
        .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime()),
    [ideas, now],
  );
  const live = upcoming.filter((i) => matches({ ...i, startsAt: i.startsAt! }, "maintenant", now));
  const list = upcoming.filter((i) => matches({ ...i, startsAt: i.startsAt! }, filter, now));
  const liveCount = live.length + villeSoon.filter((ev) => matches(asDatable(ev), "maintenant", now)).length;

  return (
    <section aria-labelledby="ca-se-passe" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-muted"><span className="live-dot" /> En direct du quartier</p>
          <h2 id="ca-se-passe" className="text-xl font-bold tracking-tight md:text-2xl">Ça se passe à Saint-Roch</h2>
        </div>
        <Link href="/evenements" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-ig-blue">Tout l&apos;agenda <ArrowRight size={14} /></Link>
      </div>


      <div role="group" aria-label="Filtrer les activités" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {FILTERS.map((f) => {
          const on = f.id === filter;
          const count = f.id === "maintenant" ? liveCount : null;
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => setFilter(f.id)}
              className={`min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-medium transition active:scale-95 ${on ? "border-fg bg-fg text-bg shadow-sm" : "border-line bg-bg hover:border-muted"}`}>
               {f.label}{count ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {!ideas ? (
        <div className="no-scrollbar flex gap-3 overflow-hidden">{[0, 1, 2].map((k) => <div key={k} className="h-[214px] w-[280px] shrink-0 animate-pulse rounded-2xl bg-hov" />)}</div>
      ) : list.length + villeList.length === 0 ? (
        <div className="surface-card px-6 py-8 text-center text-sm text-muted">
          {filter === "maintenant" ? "Rien en ce moment… " : "Rien pour ce filtre cette semaine… "}
          <Link href="/lancer" className="font-semibold text-ig-blue">et si tu lançais quelque chose ?</Link>
        </div>
      ) : (
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:px-0">
          {list.map((i) => <EventCard key={i.id} idea={i} live={live.includes(i)} />)}
          {villeList.map((ev) => <CityEventCard key={ev.id} ev={ev} live={matches(asDatable(ev), "maintenant", now)} />)}
        </ul>
      )}

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Store size={16} className="text-ig-blue" /> Nouveau dans le quartier</h3>
        {news && news.length === 0 ? (
          <Link href="/entreprises/publier" className="surface-card flex items-center gap-3 px-4 py-4 text-sm transition hover:border-ig-blue/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft text-xl"><InterfaceIcon symbol="🏪" size={24} /></span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">Aucune nouveauté pour l&apos;instant</span><span className="block text-xs text-muted">Tu as un commerce ? Publie ta promo ou ta nouveauté ici.</span></span>
            <ArrowRight size={16} className="shrink-0 text-ig-blue" />
          </Link>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(news ?? []).map((n) => (
              <li key={n.id}>
                <Link href={`/p/${n.id}`} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-bg p-3.5 transition hover:-translate-y-0.5 hover:border-ig-blue/40 hover:shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft text-xl"><InterfaceIcon symbol={businessPostTypeOf(n.postType)?.emoji ?? "🏪"} size={22} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-muted">{n.organizer.displayName}</span>
                    <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                    {n.description && <span className="line-clamp-2 block text-xs text-muted">{n.description}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EventCard({ idea, live }: { idea: Idea; live: boolean }) {
  const router = useRouter();
  const { user } = useSession();
  const [going, setGoing] = useState(idea.myContributions?.includes("participer") ?? false);
  const [helping, setHelping] = useState(idea.myContributions?.includes("benevole") ?? false);
  const [others, setOthers] = useState((idea.myContributions ?? []).filter((c) => c !== "participer" && c !== "benevole"));
  const p = dateParts(idea.startsAt!);
  const tags = tagsOf(idea);

  async function join(contribution: "participer" | "benevole") {
    if (!user) return router.push(loginHref());
    const res = await fetch(`/api/ideas/${idea.id}/complices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contribution, message: "" }),
    }).catch(() => null);
    if (!res || (!res.ok && res.status !== 409)) return toast("Impossible pour l'instant. Réessaie.");
    if (res.ok) notifyResidentProgress();
    if (contribution === "participer") {
      setGoing(true);
    } else {
      setHelping(true);
    }
    if (res.ok) confirmRegistration(idea.title);
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
            <Link href={`/p/${idea.id}`} className="line-clamp-2 text-sm font-bold leading-snug hover:text-ig-blue"> {idea.title}</Link>
          </div>
        </div>
        <p className="mt-2.5 text-xs capitalize text-muted">{p.weekday} · {p.time}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {idea.place}</p>
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => {
              const tag = IDEA_TAGS.find((x) => x.id === t)!;
              return <span key={t} className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-medium"> {tag.label}</span>;
            })}
          </div>
        )}
        {going || helping || others.length > 0 ? (
          <div className="mt-auto flex pt-3.5">
            <JoinedTag size="sm" ideaId={idea.id} contributions={[...(going ? ["participer"] : []), ...(helping ? ["benevole"] : []), ...others]}
              onLeft={() => { setGoing(false); setHelping(false); setOthers([]); }} />
          </div>
        ) : (
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
        )}
      </article>
    </li>
  );
}

// Événement de la Ville (fichier Excel) : on ne s'y inscrit pas dans l'app, on y va.
function CityEventCard({ ev, live }: { ev: VilleEvent; live: boolean }) {
  const p = dateParts(ev.startsAt);
  const go = ev.at ? `/y-aller?vers=${ev.at.lat.toFixed(6)},${ev.at.lng.toFixed(6)}&nom=${encodeURIComponent(ev.title)}` : null;
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
            <p className="line-clamp-2 text-sm font-bold leading-snug">{ev.title}</p>
          </div>
        </div>
        <p className="mt-2.5 text-xs capitalize text-muted">{p.weekday} · {p.time}</p>
        {ev.sites.length > 0 && <p className="flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {ev.sites.join(" · ")}</p>}
        <p className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-medium text-muted"><Landmark size={12} /> Ville de Québec{ev.cost ? ` · ${ev.cost}` : ""}</p>
        <div className="mt-auto flex gap-2 pt-3.5">
          {go && <Link href={go} className="ig-btn inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl text-xs font-semibold"><Navigation size={14} /> Y aller</Link>}
          {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-line text-xs font-semibold hover:bg-soft"><ExternalLink size={14} /> Site</a>}
        </div>
      </article>
    </li>
  );
}
