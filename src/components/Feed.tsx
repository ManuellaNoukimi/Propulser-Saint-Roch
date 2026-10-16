"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapPinned, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { normalizeSearch } from "@/lib/format";
import { useNow } from "@/lib/now";
import type { Idea } from "@/lib/types";
import { FeedTypeFilters, matchesType, type FeedTypeId } from "./FeedTypeFilters";
import { isLiveIdea, LiveNow } from "./LiveNow";
import { HomeMap } from "./yaller/HomeMap";
import { FeedList } from "./FeedList";
import { useIdeas } from "./useIdeas";

export function PostSkeleton() {
  return (
    <div aria-label="Chargement d’une idée" className="h-full animate-pulse overflow-hidden rounded-2xl border border-line bg-bg">
      <div className="aspect-[16/10] bg-hov" />
      <div className="space-y-4 p-5">
        <div className="h-4 w-4/5 rounded bg-hov" />
        <div className="h-3 w-full rounded bg-hov" />
        <div className="h-3 w-2/3 rounded bg-hov" />
        <div className="flex items-center gap-2 pt-3"><div className="h-7 w-7 rounded-full bg-hov" /><div className="h-3 w-24 rounded bg-hov" /></div>
        <div className="h-10 rounded-lg bg-hov" />
      </div>
    </div>
  );
}

export function Feed() {
  const { ideas, error } = useIdeas();
  const now = useNow() ?? 0;
  const [type, setType] = useState<FeedTypeId>("tout");
  const [query, setQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  // Promos, nouveautés et emplois des entreprises : dans le même fil, pour les filtres « Promos » et « Emplois »
  const [business, setBusiness] = useState<Idea[]>([]);
  useEffect(() => {
    fetch("/api/entreprises", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d: { posts: Idea[] }) => setBusiness(d.posts ?? []))
      .catch(() => {});
  }, []);

  // Ce qui est déjà « En direct » ne se répète pas dans le fil.
  const pool = useMemo(
    () => [...(ideas ?? []).filter((i) => !isLiveIdea(i, now)), ...business].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [ideas, business, now],
  );
  const visible = useMemo(() => {
    const search = normalizeSearch(query.trim());
    return pool.filter((idea) => matchesType(idea, type) &&
      (!search || normalizeSearch(`${idea.title} ${idea.description} ${idea.place} ${idea.organizer.displayName}`).includes(search)));
  }, [pool, type, query]);

  function clear() {
    setType("tout");
    setQuery("");
  }

  const filtered = type !== "tout" || query.trim().length > 0;

  return (
    <div className="feed-page mx-auto max-w-[1240px] space-y-8 px-4 py-7 md:px-8 md:py-10 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-2xl font-bold md:text-3xl">Vie Saint-Roch</h1>
      </header>

      <LiveNow ideas={ideas} />

      <section aria-label="Activités du quartier" className="space-y-6">
          <div className="feed-toolbar flex items-center gap-3">
            <div className="feed-search flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-bg px-3 focus-within:border-ig-blue focus-within:ring-2 focus-within:ring-ig-blue/10">
              <Search size={17} className="shrink-0 text-muted" />
              <input type="search" aria-label="Rechercher une idée" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une idée…" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted md:text-sm" />
              {query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-soft"><X size={14} /></button>}
            </div>
            <button type="button" title={mapOpen ? "Masquer la carte" : "Afficher la carte du quartier"} aria-label="Carte du quartier" aria-expanded={mapOpen} aria-controls="carte-du-quartier" onClick={() => setMapOpen((open) => !open)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition ${mapOpen ? "border-ig-blue bg-ig-blue/10 text-ig-blue" : "border-line bg-bg hover:bg-soft"}`}><MapPinned size={20} /></button>
          </div>
        {mapOpen && <div id="carte-du-quartier"><HomeMap /></div>}
        <FeedTypeFilters value={type} onChange={setType} ideas={pool} />
        <p role="status" aria-live="polite" className="sr-only">{ideas ? `${visible.length} publication${visible.length > 1 ? "s" : ""}` : error ? "Chargement indisponible" : "Chargement…"}</p>

        {error && <div role="alert" className="surface-card px-6 py-12 text-center"><RefreshCw size={28} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Les idées reviennent bientôt.</p><p className="mt-1 text-sm text-muted">Le chargement n&apos;a pas abouti. Réessaie dans un instant.</p><button type="button" onClick={() => window.location.reload()} className="ig-btn-secondary mt-5 text-sm">Réessayer</button></div>}
        {!ideas && !error && <ul aria-label="Chargement du fil">{Array.from({ length: 5 }, (_, key) => <li key={key} className="flex animate-pulse items-center gap-4 border-b border-line py-3"><span className="h-20 w-20 shrink-0 rounded-lg bg-hov" /><span className="flex-1 space-y-2"><span className="block h-4 w-24 rounded bg-hov" /><span className="block h-4 w-3/4 rounded bg-hov" /><span className="block h-3 w-1/3 rounded bg-hov" /></span></li>)}</ul>}
        {ideas && !error && visible.length === 0 && <div className="surface-card px-6 py-12 text-center"><Sparkles size={30} className="mx-auto text-ig-blue" /><h3 className="mt-4 text-lg font-bold">{filtered ? "Une autre idée t’attend sûrement." : "La première idée pourrait être la tienne."}</h3><p className="mt-2 text-sm text-muted">{filtered ? "Essaie un autre mot ou élargis tes catégories." : "Propose une initiative et rassemble tes premiers complices."}</p>{filtered ? <button type="button" onClick={clear} className="ig-btn-secondary mt-5 text-sm">Voir toutes les idées</button> : <Link href="/creer" className="ig-btn mt-5 text-sm"><Plus size={16} /> Proposer une idée</Link>}</div>}
        {!error && visible.length > 0 && <FeedList ideas={visible} />}
      </section>
    </div>
  );
}
