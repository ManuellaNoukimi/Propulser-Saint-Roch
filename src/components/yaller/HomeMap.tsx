"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ExternalLink, MapPin, Navigation, X } from "lucide-react";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_CENTER, SAINT_ROCH_GEOMETRY } from "@/lib/saint-roch-boundary";
import type { GoEvent } from "@/lib/y-aller-types";
import { addBaseTiles } from "@/lib/map-tiles";

const RING = (SAINT_ROCH_GEOMETRY.coordinates[0] as readonly (readonly number[])[]).map(([lng, lat]) => [lat, lng] as [number, number]);
const FILTERS = [
  { id: "tout", label: "Tout" },
  { id: "live", label: "🔴 En direct" },
  { id: "upcoming", label: "🟣 À venir" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const when = (ev: GoEvent) =>
  ev.status === "live"
    ? "En ce moment"
    : ev.startsAt
      ? new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }).format(new Date(ev.startsAt))
      : "Date à confirmer";
const goHref = (ev: GoEvent) => `/y-aller?vers=${ev.lat.toFixed(6)},${ev.lng.toFixed(6)}&nom=${encodeURIComponent(ev.title)}`;

/**
 * Accueil de Vie Saint-Roch : la carte des activités et événements du quartier (activités de l'app + événements de la Ville).
 * Pastilles numérotées : rouge qui pulse = en direct, violette = à venir. Chaque pastille a « Y aller ».
 */
export function HomeMap() {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const pinsRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<GoEvent[] | null>(null);
  const [filter, setFilter] = useState<Filter>("tout");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/y-aller/evenements", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events: GoEvent[] }) => alive && setEvents(d.events))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, []);

  // Numéro fixe par événement (en direct d'abord, puis par date), même numéro que sur « Y aller »
  const numbered = useMemo(() => (events ?? []).map((ev, i) => ({ ev, n: i + 1 })), [events]);
  const visible = useMemo(() => numbered.filter(({ ev }) => filter === "tout" || ev.status === filter), [numbered, filter]);
  const live = numbered.filter(({ ev }) => ev.status === "live").length;
  const sel = numbered.find(({ ev }) => ev.id === selected) ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current || mapRef.current) return;
      LRef.current = L;
      const touch = window.matchMedia("(pointer: coarse)").matches;
      // Sur téléphone, on glisse la page avec un doigt : la carte se déplace en pinçant (deux doigts)
      const map = L.map(box.current, { center: [SAINT_ROCH_CENTER[1], SAINT_ROCH_CENTER[0]], zoom: 15, minZoom: 13, maxZoom: 18, zoomControl: !touch, scrollWheelZoom: false, dragging: !touch });
      map.attributionControl.setPrefix(false).addAttribution(SAINT_ROCH_ATTRIBUTION);
      addBaseTiles(L, map);
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#7552de";
      L.polygon(RING, { color: accent, weight: 2, dashArray: "6 6", fillColor: accent, fillOpacity: 0.05, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds(RING), { padding: [12, 12] });
      map.on("click", () => setSelected(null));
      pinsRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = LRef.current;
    const group = pinsRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    const seen = new Map<string, number>(); // même lieu : on décale un peu les pastilles
    for (const { ev, n } of visible) {
      const key = `${ev.lat.toFixed(4)},${ev.lng.toFixed(4)}`;
      const k = seen.get(key) ?? 0;
      seen.set(key, k + 1);
      const lat = ev.lat + (k ? Math.sin(k * 2.1) * 0.00022 * Math.ceil(k / 3) : 0);
      const lng = ev.lng + (k ? Math.cos(k * 2.1) * 0.0003 * Math.ceil(k / 3) : 0);
      const on = ev.id === selected;
      L.marker([lat, lng], {
        icon: L.divIcon({ html: `<div class="ya-evt${ev.status === "live" ? " is-live" : ""}${on ? " is-on" : ""}"><span>${n}</span></div>`, className: "", iconSize: [34, 42], iconAnchor: [17, 38] }),
        title: ev.title,
        riseOnHover: true,
        zIndexOffset: on ? 2000 : ev.status === "live" ? 1000 : 0,
      })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSelected(ev.id);
        })
        .addTo(group);
    }
  }, [ready, visible, selected]);

  function focus(ev: GoEvent) {
    setSelected(ev.id);
    mapRef.current?.flyTo([ev.lat, ev.lng], Math.max(mapRef.current.getZoom(), 16), { duration: 0.6 });
  }

  return (
    <section aria-labelledby="carte-titre" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="carte-titre" className="text-xl font-bold tracking-tight">Ça se passe où ?</h2>
          <p className="mt-1 text-xs text-muted">
            {events === null ? "On place les activités sur la carte…" : `${live} en direct · ${numbered.length - live} à venir · activités du quartier et événements de la Ville`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => { setFilter(f.id); setSelected(null); }} aria-pressed={filter === f.id}
              className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition active:scale-95 ${filter === f.id ? "bg-fg text-bg" : "border border-line bg-bg hover:bg-soft"}`}>
              {f.label}
            </button>
          ))}
          <Link href="/y-aller" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs font-semibold text-ig-blue hover:bg-soft">
            <Navigation size={14} /> Y aller
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative h-[340px] overflow-hidden rounded-3xl border border-line md:h-[420px]">
          <div ref={box} className="absolute inset-0 z-0 bg-soft" role="application" aria-label="Carte des activités de Saint-Roch" />
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-1.5 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 rounded-full bg-bg/95 px-2.5 py-1 shadow-md"><span className="h-2.5 w-2.5 rounded-full bg-ig-red" /> En direct</span>
            <span className="flex items-center gap-1.5 rounded-full bg-bg/95 px-2.5 py-1 shadow-md"><span className="h-2.5 w-2.5 rounded-full bg-ig-blue" /> À venir</span>
          </div>
          {sel && (
            <div className="ya-card-pop absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-line bg-bg p-4 shadow-2xl md:inset-x-auto md:left-3 md:w-[340px]" role="dialog" aria-label={sel.ev.title}>
              <div className="flex items-start gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black text-white ${sel.ev.status === "live" ? "bg-ig-red" : "bg-ig-blue"}`}>{sel.n}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{sel.ev.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{sel.ev.status === "live" ? "🔴 " : "📅 "}{when(sel.ev)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">📍 {sel.ev.place}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Fermer" className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-soft"><X size={16} /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={goHref(sel.ev)} className="ig-btn min-h-10 flex-1 px-4 text-sm"><Navigation size={15} /> Y aller</Link>
                {sel.ev.href ? (
                  <Link href={sel.ev.href} className="ig-btn-secondary min-h-10 px-4 text-sm"><CalendarDays size={15} /> Voir</Link>
                ) : sel.ev.url ? (
                  <a href={sel.ev.url} target="_blank" rel="noopener noreferrer" className="ig-btn-secondary min-h-10 px-4 text-sm"><ExternalLink size={15} /> Site</a>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Liste numérotée (même numéro que sur la carte) */}
        <ol className="ya-chips flex gap-2 overflow-x-auto pb-1 lg:max-h-[420px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
          {events === null && Array.from({ length: 3 }, (_, k) => <li key={k} className="h-[76px] w-[260px] shrink-0 animate-pulse rounded-2xl bg-soft lg:w-auto" />)}
          {events !== null && visible.length === 0 && (
            <li className="w-full rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">
              {filter === "live" ? "Rien en direct pour l'instant." : "Aucune activité à venir pour l'instant."}
            </li>
          )}
          {visible.map(({ ev, n }) => (
            <li key={ev.id} className="w-[260px] shrink-0 lg:w-auto">
              <button type="button" onClick={() => focus(ev)} aria-pressed={ev.id === selected}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.99] ${ev.id === selected ? "border-ig-blue bg-ig-blue/5" : "border-line bg-bg hover:bg-soft"}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black text-white ${ev.status === "live" ? "bg-ig-red" : "bg-ig-blue"}`}>{n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{ev.title}</span>
                  <span className="block truncate text-xs text-muted">{when(ev)}</span>
                  <span className="flex items-center gap-1 truncate text-[11px] text-muted"><MapPin size={11} className="shrink-0" /> <span className="truncate">{ev.place}</span></span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
