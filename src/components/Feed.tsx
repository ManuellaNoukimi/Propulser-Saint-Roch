"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, MapPin, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { matchesDate, normalizeSearch } from "@/lib/format";
import { Chips } from "./Chips";
import { Happening } from "./Happening";
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

  const visible = useMemo(() => {
    const search = normalizeSearch(query.trim());
    const result = (ideas ?? []).filter((idea) =>
      (category === "toutes" || idea.category === category) &&
      (filter !== "semaine" || matchesDate(idea.startsAt, "semaine")) &&
      (!search || normalizeSearch(`${idea.title} ${idea.description} ${idea.place} ${idea.organizer.displayName}`).includes(search)),
    );
    return filter === "populaire" ? result.sort((a, b) => b.complicesCount - a.complicesCount) : result;
  }, [ideas, filter, category, query]);

  function clear() {
    setCategory("toutes");
    setQuery("");
    setFilter("recent");
  }

  const filtered = category !== "toutes" || query.trim().length > 0 || filter === "semaine";

  return (
    <div className="mx-auto max-w-[1320px] space-y-7 px-4 py-5 md:px-7 md:py-8 lg:px-9">
      <header className="gallery-intro flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-line px-6 py-7 md:px-8 md:py-8">
        <div className="relative max-w-xl">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-muted"><MapPin size={12} /> Saint-Roch, Québec</p>
          <h1 className="text-[30px] font-bold leading-[1.12] tracking-tight md:text-[36px]">Des idées à faire <span className="text-ig-blue">ensemble.</span></h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">Découvre une initiative, propose un coup de main, crée du lien.</p>
        </div>
        <div className="relative flex flex-col items-start gap-3">
          <Link href="/lancer" className="ig-btn min-h-11 px-5 text-sm"><Sparkles size={18} /> Lancer une idée</Link>
          <Link href="/evenements" className="flex items-center gap-2 px-1 text-xs font-semibold text-muted hover:text-ig-blue"><CalendarDays size={15} /> Voir l&apos;agenda du quartier <ArrowRight size={13} /></Link>
        </div>
      </header>

      <Happening ideas={ideas} />

      <section aria-labelledby="galerie-titre" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 id="galerie-titre" className="text-xl font-bold tracking-tight">À découvrir dans le quartier</h2><p role="status" aria-live="polite" className="mt-1 text-xs text-muted">{ideas ? `${visible.length} idée${visible.length > 1 ? "s" : ""} à découvrir` : error ? "La galerie est momentanément indisponible" : "On prépare les découvertes…"}</p></div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-bg px-3 focus-within:border-ig-blue focus-within:ring-2 focus-within:ring-ig-blue/10 sm:w-[260px]">
              <Search size={17} className="shrink-0 text-muted" />
              <input type="search" aria-label="Rechercher une idée" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une idée…" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted md:text-sm" />
              {query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-soft"><X size={14} /></button>}
            </div>
            <select aria-label="Trier ou filtrer les idées" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-11 max-w-full rounded-xl border border-line bg-bg px-3 text-xs font-medium">
              <option value="recent">Les plus récentes</option>
              <option value="populaire">Le plus de complices</option>
              <option value="semaine">Cette semaine</option>
            </select>
          </div>
        </div>

        <Chips label="Catégories" value={category} onChange={setCategory} options={[{ id: "toutes", label: "Toutes les idées", emoji: "✨" }, ...CATEGORIES]} />
        {filtered && <button type="button" onClick={clear} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-ig-blue"><X size={13} /> Réinitialiser les filtres</button>}

        {error && <div role="alert" className="surface-card px-6 py-12 text-center"><RefreshCw size={28} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Les idées reviennent bientôt.</p><p className="mt-1 text-sm text-muted">Le chargement n&apos;a pas abouti. Réessaie dans un instant.</p><button type="button" onClick={() => window.location.reload()} className="ig-btn-secondary mt-5 text-sm">Réessayer</button></div>}
        {!ideas && !error && <div className="idea-grid">{Array.from({ length: 6 }, (_, key) => <PostSkeleton key={key} />)}</div>}
        {ideas && !error && visible.length === 0 && <div className="surface-card px-6 py-12 text-center"><Sparkles size={30} className="mx-auto text-ig-blue" /><h3 className="mt-4 text-lg font-bold">{filtered ? "Une autre idée t’attend sûrement." : "La première idée pourrait être la tienne."}</h3><p className="mt-2 text-sm text-muted">{filtered ? "Essaie un autre mot ou élargis tes catégories." : "Propose une initiative et rassemble tes premiers complices."}</p>{filtered ? <button type="button" onClick={clear} className="ig-btn-secondary mt-5 text-sm">Voir toutes les idées</button> : <Link href="/creer" className="ig-btn mt-5 text-sm"><Plus size={16} /> Proposer une idée</Link>}</div>}
        {!error && visible.length > 0 && <PostGrid ideas={visible} />}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-5 text-[10px] text-muted"><p>Complices · Des idées à faire ensemble.</p><p>Hackathon Saint-Roch 2026</p></footer>
    </div>
  );
}
