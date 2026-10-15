"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ACTOR_TYPES, CATEGORIES, DATE_FILTERS, type DateFilterId } from "@/lib/constants";
import { matchesDate, normalizeSearch } from "@/lib/format";
import { Chips } from "./Chips";
import { PostGrid } from "./PostGrid";
import { useIdeas } from "./useIdeas";

export function ExploreView() {
  const { ideas, error } = useIdeas();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("toutes");
  const [actor, setActor] = useState("tous");
  const [date, setDate] = useState<DateFilterId>("toutes");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = normalizeSearch(q.trim());
    return (ideas ?? []).filter((idea) =>
      (category === "toutes" || idea.category === category) && (actor === "tous" || idea.organizer.accountType === actor) && matchesDate(idea.startsAt, date) && (!query || normalizeSearch(`${idea.title} ${idea.description} ${idea.place} ${idea.organizer.displayName}`).includes(query)),
    );
  }, [ideas, q, category, actor, date]);

  const extraFilters = Number(actor !== "tous") + Number(date !== "toutes");
  const active = category !== "toutes" || extraFilters > 0 || q.trim().length > 0;
  function clear() { setQ(""); setCategory("toutes"); setActor("tous"); setDate("toutes"); }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-4 pb-6 pt-5 md:px-7 md:pt-9 lg:px-9">
      <header className="px-4 md:px-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Tout près de toi</p><h1 className="mt-1 text-[28px] font-bold tracking-tight">La prochaine découverte<span className="text-ig-blue">.</span></h1><p className="mt-1 text-sm text-muted">Une activité, un lieu, une idée à faire grandir.</p></header>
      <div className="flex gap-2 px-4 md:px-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-bg px-3 focus-within:border-ig-blue focus-within:ring-2 focus-within:ring-ig-blue/10">
          <Search size={19} className="shrink-0 text-muted" /><input type="search" aria-label="Rechercher dans le quartier" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Une idée, un lieu, un commerce…" className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted md:text-sm" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-soft"><X size={16} /></button>}
        </div>
        <button type="button" aria-expanded={filtersOpen} aria-controls="filtres-explorer" onClick={() => setFiltersOpen(!filtersOpen)} className={`flex min-h-12 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${filtersOpen || extraFilters ? "border-fg bg-fg text-bg" : "border-line bg-bg hover:bg-soft"}`}><SlidersHorizontal size={18} /><span className="hidden sm:inline">Filtres</span>{extraFilters > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-ig-blue text-[10px] text-white">{extraFilters}</span>}</button>
      </div>
      <Chips label="Catégorie" value={category} onChange={setCategory} options={[{ id: "toutes", label: "Tout" }, ...CATEGORIES.map((item) => ({ id: item.id, label: item.label, emoji: item.emoji }))]} />
      {filtersOpen && <div id="filtres-explorer" className="mx-4 space-y-4 rounded-2xl border border-line bg-bg px-1 py-4 animate-fade-in md:mx-0 md:px-4"><Chips label="Organisé par" value={actor} onChange={setActor} options={[{ id: "tous", label: "Tout le monde" }, ...ACTOR_TYPES.map((item) => ({ id: item.id, label: item.label, emoji: item.emoji }))]} /><Chips label="Quand ?" value={date} onChange={(value) => setDate(value as DateFilterId)} options={[...DATE_FILTERS]} /></div>}
      <div className="flex min-h-6 items-center justify-between gap-3 px-4 md:px-0"><p role="status" aria-live="polite" className="text-xs text-muted">{ideas ? `${filtered.length} publication${filtered.length > 1 ? "s" : ""}${q.trim() ? ` pour « ${q.trim()} »` : " à découvrir"}` : error ? "Chargement indisponible" : "On fait le tour du quartier…"}</p>{active && <button type="button" onClick={clear} className="shrink-0 text-xs font-semibold text-ig-blue">Tout effacer</button>}</div>
      {error && <p role="alert" className="surface-card mx-4 p-8 text-center text-muted md:mx-0">Les publications sont momentanément indisponibles.</p>}
      {!ideas && !error && <div className="idea-grid">{Array.from({ length: 6 }, (_, key) => <div key={key} className="h-[420px] animate-pulse rounded-2xl bg-hov" />)}</div>}
      {ideas && filtered.length === 0 && <div className="surface-card mx-4 px-6 py-12 text-center md:mx-0"><Search size={32} strokeWidth={1.4} className="mx-auto text-muted" /><p className="mt-4 text-lg font-semibold">Pas encore de découverte ici.</p><p className="mt-1 text-sm text-muted">Essaie un autre mot ou élargis tes filtres.</p><button type="button" onClick={clear} className="ig-btn-secondary mt-5 text-sm">Voir toutes les publications</button></div>}
      {ideas && filtered.length > 0 && <PostGrid ideas={filtered} />}
    </div>
  );
}
