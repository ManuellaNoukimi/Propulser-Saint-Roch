"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./map3d.css";
import "./compact-markers.css";
import type { Map as MlMap, Marker } from "maplibre-gl";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ExternalLink, Globe, MapPin, Navigation, X } from "lucide-react";
import { BEARING_3D, PITCH_3D, createMap3D, htmlMarker, setSatelliteMode, type MapLib } from "@/lib/map3d";
import type { GoEvent } from "@/lib/y-aller-types";
import { InterfaceIcon } from "@/components/InterfaceIcon";

const FILTERS = [
  { id: "tout", label: "Tout" },
  { id: "live", label: " En direct" },
  { id: "upcoming", label: " À venir" },
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
 * Carte 3D (bâtiments en volume). Pastilles numérotées : rouge qui pulse = en direct, violette = à venir. Chaque pastille a « Y aller ».
 */
export function HomeMap() {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const libRef = useRef<MapLib | null>(null);
  const pins = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<GoEvent[] | null>(null);
  const [filter, setFilter] = useState<Filter>("tout");
  const [selected, setSelected] = useState<string | null>(null);
  const [is3d, setIs3d] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);

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
    let created: MlMap | null = null;
    (async () => {
      if (!box.current) return;
      const { maplibregl, map } = await createMap3D(box.current, { controls: !window.matchMedia("(pointer: coarse)").matches, cooperative: true, zoom: 14.4 });
      created = map;
      if (cancelled) return map.remove();
      libRef.current = maplibregl;
      map.on("click", () => setSelected(null));
      map.on("pitchend", () => setIs3d(map.getPitch() > 10));
      map.easeTo({ bearing: BEARING_3D + 14, duration: 2500 }); // légère rotation à l'arrivée
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      (mapRef.current ?? created)?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    pins.current.forEach((m) => m.remove());
    pins.current = [];
    for (const { ev, n } of visible) {
      const on = ev.id === selected;
      pins.current.push(
        htmlMarker(L, map, ev, `<div class="ya-evt${ev.status === "live" ? " is-live" : ""}${on ? " is-on" : ""}"><span>${n}</span></div>`, {
          title: ev.title,
          anchor: "center",
          z: on ? 30 : ev.status === "live" ? 20 : 10,
          onClick: () => setSelected(ev.id),
        }),
      );
    }
  }, [ready, visible, selected]);

  function focus(ev: GoEvent) {
    setSelected(ev.id);
    mapRef.current?.flyTo({ center: [ev.lng, ev.lat], zoom: Math.max(mapRef.current.getZoom(), 16.4), pitch: is3d ? PITCH_3D : 0, duration: 1100 });
  }

  function toggle3d() {
    const next = !is3d;
    setIs3d(next);
    mapRef.current?.easeTo({ pitch: next ? PITCH_3D : 0, bearing: next ? BEARING_3D : 0, duration: 900 });
  }

  function toggleSatellite() {
    const next = !isSatellite;
    setIsSatellite(next);
    if (mapRef.current) setSatelliteMode(mapRef.current, next);
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
        <div className="map-points relative h-[340px] overflow-hidden rounded-3xl border border-line md:h-[420px]">
          <div ref={box} className="ya-map3d-canvas z-0 bg-soft" role="application" aria-label="Carte 3D des activités de Saint-Roch" />
          <div className="absolute bottom-3 right-3 z-10 flex gap-2">
            <button
              type="button"
              onClick={toggleSatellite}
              aria-pressed={isSatellite}
              aria-label={isSatellite ? "Passer en vue Plan" : "Passer en vue Satellite"}
              title={isSatellite ? "Vue Plan" : "Vue Satellite HD"}
              className={`grid h-10 w-10 place-items-center rounded-full border border-line bg-bg/95 text-xs font-black shadow-md backdrop-blur transition active:scale-90 ${isSatellite ? "text-ig-blue border-ig-blue" : "text-fg"}`}
            >
              <Globe size={18} />
            </button>
            <button
              type="button"
              onClick={toggle3d}
              aria-pressed={is3d}
              aria-label={is3d ? "Passer en vue 2D" : "Passer en vue 3D"}
              title={is3d ? "Vue 2D" : "Vue 3D"}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-bg/95 text-xs font-black shadow-md backdrop-blur transition active:scale-90"
            >
              {is3d ? "2D" : "3D"}
            </button>
          </div>
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
                  <p className="mt-0.5 text-xs text-muted">{sel.ev.status === "live" ? " " : " "}{when(sel.ev)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted"><InterfaceIcon symbol="📍" size={14} /> {sel.ev.place}</p>
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
