"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, Megaphone, Store, Vote, X } from "lucide-react";
import { BOOKING_PROJECTS, FREQUENCIES, WISHES, wishOf } from "@/lib/quartier";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_GEOMETRY } from "@/lib/saint-roch-boundary";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";

// Problème 4 : « Vitrines à remplir ». AFFICHAGE DE DÉMO : les locaux, adresses et chiffres sont des EXEMPLES fictifs
// (la liste réelle des locaux vacants de la SDC est confidentielle et n'est pas utilisée).

type Vacancy = {
  id: string; label: string; street: string; lat: number; lng: number; surface: string; details: string;
  votes: Record<string, number>; visits: number; booking?: { project: string; title: string; when: string };
};
const VACANCIES: Vacancy[] = [
  { id: "v1", label: "Local vide n° 1", street: "rue Saint-Joseph Est", lat: 46.81391, lng: -71.22548, surface: "Petit local, environ 60 m²", details: "Ancienne boutique avec grande vitrine.", votes: { epicerie: 9, boucherie: 2, fruiterie: 2, boulangerie: 1 }, visits: 26 },
  { id: "v2", label: "Local vide n° 2", street: "rue Saint-Joseph Est", lat: 46.81508, lng: -71.222, surface: "Local moyen, environ 120 m²", details: "Rez-de-chaussée lumineux avec arrière-boutique.", votes: { boucherie: 6, epicerie: 2, boulangerie: 2 }, visits: 17, booking: { project: "expo", title: "Expo des jeunes artistes de l'Atelier Couleurs", when: "dans 10 jours, pendant 3 semaines" } },
  { id: "v3", label: "Local vide n° 3", street: "rue Saint-Joseph Est", lat: 46.81603, lng: -71.21899, surface: "Grand local, environ 200 m²", details: "Ancien restaurant, cuisine sur place.", votes: { resto: 5, cafe: 3, librairie: 1 }, visits: 12 },
  { id: "v4", label: "Local vide n° 4", street: "rue Saint-Joseph Est", lat: 46.81272, lng: -71.2292, surface: "Petit local, environ 45 m²", details: "Vitrine d'angle très visible.", votes: { boulangerie: 4, cafe: 2 }, visits: 9 },
  { id: "v5", label: "Local vide n° 5", street: "rue du Pont", lat: 46.8164, lng: -71.22146, surface: "Local moyen, environ 90 m²", details: "Près de l'intersection avec Saint-Joseph.", votes: { pharmacie: 4, epicerie: 2, fruiterie: 1 }, visits: 11 },
];

export function VitrinesView() {
  const { user } = useSession();
  const [data, setData] = useState(VACANCIES);
  const [selectedId, setSelectedId] = useState<string>("v1");
  const [sheet, setSheet] = useState<"vote" | "book" | "commerce" | null>(null);
  const selected = data.find((v) => v.id === selectedId)!;

  const totals = useMemo(() => {
    const all: Record<string, number> = {};
    for (const v of data) for (const [w, n] of Object.entries(v.votes)) all[w] = (all[w] ?? 0) + n;
    return Object.entries(all).sort((a, b) => b[1] - a[1]);
  }, [data]);

  function vote(wish: string, perWeek: number) {
    setData((d) => d.map((v) => (v.id === selectedId ? { ...v, votes: { ...v.votes, [wish]: (v.votes[wish] ?? 0) + 1 }, visits: v.visits + perWeek } : v)));
    setSheet(null);
    toast(`Merci ! +1 pour ${wishOf(wish)?.label.toLowerCase()} ici. Ta voix aide à attirer le bon commerce.`);
  }

  function book(project: string, title: string, weeks: number) {
    setData((d) => d.map((v) => (v.id === selectedId ? { ...v, booking: { project, title, when: `dès la semaine prochaine, pendant ${weeks} semaine${weeks > 1 ? "s" : ""}` } } : v)));
    setSheet(null);
    toast("🎉 Demande envoyée : la vitrine devient vivante !");
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-5 md:px-7 md:py-8">
      <header className="gallery-intro rounded-3xl border border-line px-6 py-7 md:px-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted">Problème 4 · Les commerces souffrent</p>
        <h1 className="text-[28px] font-bold leading-[1.12] tracking-tight md:text-[36px]">🟠 Vitrines à remplir</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Les locaux vides deviennent visibles et utiles : dis ce que tu veux voir ici (une preuve de demande pour les propriétaires) ou occupe la vitrine en attendant.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          {[["3.5", "Diagnostic des espaces vacants"], ["3.10", "Boutique éphémère sur rue"], ["2.8", "Ateliers d'artistes"]].map(([id, l]) => (
            <span key={id} className="inline-flex items-center gap-2 rounded-xl bg-bg/80 px-3 py-2"><span className="rounded-md bg-ig-blue px-2 py-0.5 text-[10px] font-bold text-white">Action {id}</span> {l}</span>
          ))}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-3xl border border-line bg-bg">
          <VacancyMap vacancies={data} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <section key={selected.id} className="surface-card animate-fade-in p-5 md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#e07000]">🟠 Local vide · exemple</p>
          <h2 className="mt-1 text-xl font-bold">{selected.label}, {selected.street}</h2>
          <p className="mt-1 text-sm text-muted">{selected.surface} · {selected.details}</p>

          <h3 className="mt-5 text-sm font-bold">Ce que les gens veulent ici</h3>
          <VoteBars votes={selected.votes} />
          <p className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-sm">
            👉 <span className="font-semibold">{Object.values(selected.votes).reduce((a, b) => a + b, 0)} personnes</span> ont voté, et promettent environ <span className="font-semibold">{selected.visits} visites par semaine</span>. Une preuve de demande, pas un pari.
          </p>

          {selected.booking && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-ig-blue/30 bg-ig-blue/5 px-3 py-2.5 text-sm">
              <CalendarRange size={17} className="mt-0.5 shrink-0 text-ig-blue" />
              <span><span className="font-semibold">Occupée en attendant :</span> {selected.booking.title} ({selected.booking.when})</span>
            </p>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setSheet("vote")} className="ig-btn min-h-11 text-sm"><Vote size={17} /> Ce que je veux ici</button>
            <button type="button" onClick={() => setSheet("book")} className="ig-btn-secondary min-h-11 text-sm"><CalendarRange size={17} /> L&apos;occuper en attendant</button>
          </div>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="surface-card p-5 md:p-6">
          <h2 className="font-bold">Ce qui manque le plus, dans tout le quartier</h2>
          <ul className="mt-3 space-y-2">
            {totals.slice(0, 5).map(([w, n], k) => (
              <li key={w} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right font-bold text-muted">{k + 1}</span>
                <span className="text-lg">{wishOf(w)?.emoji}</span>
                <span className="flex-1">{wishOf(w)?.label}</span>
                <span className="font-semibold tabular-nums">{n} votes</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Le Plan de la Ville le confirme : il manque des épiceries et des boucheries à Saint-Roch.</p>
        </section>
        <section className="surface-card p-5 md:p-6">
          <h2 className="flex items-center gap-2 font-bold"><Store size={18} className="text-ig-blue" /> Mon commerce</h2>
          <p className="mt-1 text-sm text-muted">Tu as un commerce actif ? Publie une promo, une nouveauté ou un événement en 1 minute : ça apparaît dans « Ça se passe à Saint-Roch ».</p>
          <button type="button" onClick={() => setSheet("commerce")} className="ig-btn-secondary mt-4 w-full text-sm"><Megaphone size={16} /> Publier une promo ou une nouveauté</button>
        </section>
      </div>
      <p className="text-[11px] text-muted">Fond de carte © OpenStreetMap, CARTO.</p>

      {sheet === "vote" && <VoteSheet onClose={() => setSheet(null)} onVote={vote} />}
      {sheet === "book" && <BookSheet onClose={() => setSheet(null)} onBook={book} />}
      {sheet === "commerce" && <CommerceSheet name={user?.displayName} onClose={() => setSheet(null)} />}
    </div>
  );
}

function VoteBars({ votes }: { votes: Record<string, number> }) {
  const list = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...list.map(([, n]) => n));
  return (
    <ul className="mt-3 space-y-2.5">
      {list.map(([w, n], k) => (
        <li key={w}>
          <div className="flex items-center justify-between text-sm">
            <span>{wishOf(w)?.emoji} {wishOf(w)?.label}</span>
            <span className="font-semibold tabular-nums">{n}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sep">
            <div className={`h-full rounded-full transition-all duration-700 ${k === 0 ? "bg-[#ff8a00]" : "bg-ig-blue/50"}`} style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in md:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[88dvh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function VoteSheet({ onClose, onVote }: { onClose: () => void; onVote: (wish: string, perWeek: number) => void }) {
  const [wish, setWish] = useState<string | null>(null);
  const [freq, setFreq] = useState(1);
  return (
    <Sheet title="Ce que je veux ici" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {WISHES.map((w) => (
          <button key={w.id} type="button" aria-pressed={wish === w.id} onClick={() => setWish(w.id)}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm transition active:scale-[0.98] ${wish === w.id ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
            <span className="text-lg">{w.emoji}</span> {w.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold">J&apos;y irais environ…</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <button key={f.id} type="button" aria-pressed={freq === f.id} onClick={() => setFreq(f.id)}
            className={`min-h-10 rounded-full border px-3.5 text-xs font-medium transition ${freq === f.id ? "border-fg bg-fg text-bg" : "border-line"}`}>{f.label}</button>
        ))}
      </div>
      <button type="button" disabled={!wish} onClick={() => wish && onVote(wish, freq)} className="ig-btn mt-6 min-h-11 w-full text-sm">Voter</button>
    </Sheet>
  );
}

function BookSheet({ onClose, onBook }: { onClose: () => void; onBook: (project: string, title: string, weeks: number) => void }) {
  const [project, setProject] = useState<string>("expo");
  const [title, setTitle] = useState("");
  const [weeks, setWeeks] = useState(2);
  return (
    <Sheet title="L'occuper en attendant" onClose={onClose}>
      <p className="text-sm text-muted">Artiste, étudiant·e, organisme, créateur·rice : réserve la vitrine de 1 à 4 semaines.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {BOOKING_PROJECTS.map((p) => (
          <button key={p.id} type="button" aria-pressed={project === p.id} onClick={() => setProject(p.id)}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm transition ${project === p.id ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
            <span className="text-lg">{p.emoji}</span> {p.label}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Nom du projet (ex. : Expo photo du quartier)" className="ig-input mt-4" />
      <p className="mt-4 text-sm font-semibold">Durée</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((w) => (
          <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)}
            className={`min-h-10 rounded-xl text-sm font-bold transition ${weeks === w ? "bg-ig-blue text-white" : "bg-soft"}`}>{w} sem.</button>
        ))}
      </div>
      <button type="button" onClick={() => onBook(project, title.trim() || BOOKING_PROJECTS.find((p) => p.id === project)!.label, weeks)} className="ig-btn mt-6 min-h-11 w-full text-sm">Demander la vitrine</button>
    </Sheet>
  );
}

function CommerceSheet({ name, onClose }: { name?: string; onClose: () => void }) {
  const [kind, setKind] = useState("promo");
  const [title, setTitle] = useState("");
  return (
    <Sheet title="Mon commerce" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {[["promo", "🏷️ Promo"], ["nouveau", "✨ Nouveauté"], ["evenement", "📅 Événement"]].map(([id, l]) => (
          <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}
            className={`min-h-11 rounded-xl border text-xs font-semibold transition ${kind === id ? "border-ig-blue bg-ig-blue/10" : "border-line"}`}>{l}</button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex. : 2e café à moitié prix cet après-midi" className="ig-input mt-4" />
      <button type="button" onClick={() => { onClose(); toast(`📣 Publié${name ? ` pour ${name}` : ""} : visible dans « Ça se passe à Saint-Roch »`); }} className="ig-btn mt-5 min-h-11 w-full text-sm">Publier</button>
    </Sheet>
  );
}

/** Carte Leaflet : quartier en clair, pastilles orange pour les locaux vides. */
function VacancyMap({ vacancies, selectedId, onSelect }: { vacancies: Vacancy[]; selectedId: string; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const map = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, minZoom: 13, maxZoom: 19 });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.attributionControl.setPrefix(false).addAttribution(SAINT_ROCH_ATTRIBUTION);
      L.tileLayer(dark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd", maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      const ring = (SAINT_ROCH_GEOMETRY.coordinates[0] as readonly (readonly number[])[]).map(([lng, lat]) => [lat, lng] as [number, number]);
      const world: [number, number][] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
      L.polygon([world, ring], { stroke: false, fillColor: dark ? "#000" : "#252137", fillOpacity: dark ? 0.45 : 0.16, interactive: false }).addTo(map);
      L.polygon(ring, { color: "#7552de", weight: 2, dashArray: "6 6", fill: false, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds(vacancies.map((v) => [v.lat, v.lng] as [number, number])).pad(0.6));
      layer.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // la carte n'est créée qu'une fois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = LRef.current;
    if (!ready || !L || !layer.current) return;
    layer.current.clearLayers();
    for (const v of vacancies) {
      const on = v.id === selectedId;
      L.marker([v.lat, v.lng], {
        icon: L.divIcon({ html: `<div class="vac-pin ${on ? "vac-pin--on" : ""}"><span>🏬</span></div>`, className: "", iconSize: [38, 38], iconAnchor: [19, 19] }),
        title: v.label, keyboard: true, zIndexOffset: on ? 1000 : 0,
      }).on("click", () => onSelect(v.id)).addTo(layer.current);
    }
    const sel = vacancies.find((v) => v.id === selectedId);
    if (sel) mapRef.current?.panTo([sel.lat, sel.lng], { animate: true });
  }, [ready, vacancies, selectedId, onSelect]);

  return <div ref={el} className="h-[320px] w-full bg-soft md:h-[460px]" aria-label="Carte des locaux vides de Saint-Roch" />;
}
