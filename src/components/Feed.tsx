"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPinned, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { ACTOR_TYPES, CATEGORIES, DATE_FILTERS, type DateFilterId } from "@/lib/constants";
import { matchesDate, normalizeSearch } from "@/lib/format";
import { FeedFilters } from "./FeedFilters";
import { HomeMap } from "./yaller/HomeMap";
import { PostGrid } from "./PostGrid";
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
  const [filter, setFilter] = useState("recent");
  const [category, setCategory] = useState("toutes");
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("tous");
  const [date, setDate] = useState<DateFilterId>("toutes");
  const [mapOpen, setMapOpen] = useState(false);

  const visible = useMemo(() => {
    const search = normalizeSearch(query.trim());
    const result = (ideas ?? []).filter((idea) =>
      (category === "toutes" || idea.category === category) &&
      (actor === "tous" || idea.organizer.accountType === actor) &&
      matchesDate(idea.startsAt, date) &&
      (!search || normalizeSearch(`${idea.title} ${idea.description} ${idea.place} ${idea.organizer.displayName}`).includes(search)),
    );
    return filter === "populaire" ? result.sort((a, b) => b.complicesCount - a.complicesCount) : result;
  }, [ideas, filter, category, query, actor, date]);

  function resetFilters() {
    setCategory("toutes");
    setFilter("recent");
    setActor("tous");
    setDate("toutes");
  }

  function clear() {
    resetFilters();
    setQuery("");
  }

  const filterCount = Number(category !== "toutes") + Number(filter !== "recent") + Number(actor !== "tous") + Number(date !== "toutes");
  const filtered = category !== "toutes" || query.trim().length > 0 || actor !== "tous" || date !== "toutes";

  return (
    <div className="feed-page mx-auto max-w-[1240px] space-y-8 px-4 py-7 md:px-8 md:py-10 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-2xl font-bold md:text-3xl">Vie Saint-Roch</h1>
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-muted hover:text-fg"><ArrowLeft size={14} /> Changer d&apos;espace</Link>
      </header>

      <section aria-label="Activités du quartier" className="space-y-6">
          <div className="feed-toolbar flex items-center gap-3">
            <div className="feed-search flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-bg px-3 focus-within:border-ig-blue focus-within:ring-2 focus-within:ring-ig-blue/10">
              <Search size={17} className="shrink-0 text-muted" />
              <input type="search" aria-label="Rechercher une idée" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une idée…" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted md:text-sm" />
              {query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-soft"><X size={14} /></button>}
            </div>
            <button type="button" title={mapOpen ? "Masquer la carte" : "Afficher la carte du quartier"} aria-label="Carte du quartier" aria-expanded={mapOpen} aria-controls="carte-du-quartier" onClick={() => setMapOpen((open) => !open)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition ${mapOpen ? "border-ig-blue bg-ig-blue/10 text-ig-blue" : "border-line bg-bg hover:bg-soft"}`}><MapPinned size={20} /></button>
            <FeedFilters count={filterCount} onReset={resetFilters} fields={[
              { label: "Catégorie", value: category, onChange: setCategory, options: [{ id: "toutes", label: "Toutes les catégories" }, ...CATEGORIES] },
              { label: "Quand ?", value: date, onChange: (value) => setDate(value as DateFilterId), options: DATE_FILTERS },
              { label: "Organisé par", value: actor, onChange: setActor, options: [{ id: "tous", label: "Tout le monde" }, ...ACTOR_TYPES] },
              { label: "Trier par", value: filter, onChange: setFilter, options: [{ id: "recent", label: "Les plus récentes" }, { id: "populaire", label: "Le plus de complices" }] },
            ]} />
          </div>
        {mapOpen && <div id="carte-du-quartier"><HomeMap /></div>}
        <p role="status" aria-live="polite" className="text-xs text-muted">{ideas ? `${visible.length} activité${visible.length > 1 ? "s" : ""}` : error ? "Chargement indisponible" : "Chargement…"}</p>

        {error && <div role="alert" className="surface-card px-6 py-12 text-center"><RefreshCw size={28} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Les idées reviennent bientôt.</p><p className="mt-1 text-sm text-muted">Le chargement n&apos;a pas abouti. Réessaie dans un instant.</p><button type="button" onClick={() => window.location.reload()} className="ig-btn-secondary mt-5 text-sm">Réessayer</button></div>}
        {!ideas && !error && <div className="idea-grid">{Array.from({ length: 6 }, (_, key) => <PostSkeleton key={key} />)}</div>}
        {ideas && !error && visible.length === 0 && <div className="surface-card px-6 py-12 text-center"><Sparkles size={30} className="mx-auto text-ig-blue" /><h3 className="mt-4 text-lg font-bold">{filtered ? "Une autre idée t’attend sûrement." : "La première idée pourrait être la tienne."}</h3><p className="mt-2 text-sm text-muted">{filtered ? "Essaie un autre mot ou élargis tes catégories." : "Propose une initiative et rassemble tes premiers complices."}</p>{filtered ? <button type="button" onClick={clear} className="ig-btn-secondary mt-5 text-sm">Voir toutes les idées</button> : <Link href="/creer" className="ig-btn mt-5 text-sm"><Plus size={16} /> Proposer une idée</Link>}</div>}
        {!error && visible.length > 0 && <PostGrid ideas={visible} />}
      </section>
    </div>
  );
}
