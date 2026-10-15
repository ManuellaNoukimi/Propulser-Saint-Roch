"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_BOUNDS, SAINT_ROCH_CENTER, SAINT_ROCH_GEOMETRY } from "@/lib/saint-roch-boundary";
import { PARKING_COLOR, modeOf } from "@/lib/y-aller-ui";
import type { BikeStation, BusStop, Charger, GoEvent, LatLng, Layers, Parking, Trip } from "@/lib/y-aller-types";
import { addBaseTiles } from "@/lib/map-tiles";

export type Show = { parkings: boolean; velo: boolean; bus: boolean; bornes: boolean; events: boolean };
export type Selected =
  | { kind: "parking"; item: Parking }
  | { kind: "bike"; item: BikeStation }
  | { kind: "bus"; item: BusStop }
  | { kind: "charger"; item: Charger }
  | { kind: "event"; item: GoEvent; n: number };

const RING = (SAINT_ROCH_GEOMETRY.coordinates[0] as readonly (readonly number[])[]).map(([lng, lat]) => [lat, lng] as [number, number]);

/** Carte « Y aller » : stationnements, vélos, bus, bornes, événements numérotés et trajet tracé. */
export function GoMap({
  layers,
  show,
  events,
  from,
  to,
  trip,
  selectedId,
  chosenParkingId,
  onSelect,
  padBottom,
}: {
  layers: Layers | null;
  show: Show;
  events: GoEvent[];
  from: LatLng | null;
  to: LatLng | null;
  trip: Trip | null;
  selectedId: string | null;
  chosenParkingId: string | null;
  onSelect: (s: Selected | null) => void;
  padBottom: () => number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const dataRef = useRef<Leaflet.LayerGroup | null>(null);
  const eventsRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeRef = useRef<Leaflet.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const padRef = useRef(padBottom);
  const fitted = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    onSelectRef.current = onSelect;
    padRef.current = padBottom;
  }, [onSelect, padBottom]);

  // 1) Création de la carte (Leaflet seulement dans le navigateur)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current || mapRef.current) return;
      LRef.current = L;
      const [[w, s], [e, n]] = SAINT_ROCH_BOUNDS;
      const map = L.map(box.current, {
        center: [SAINT_ROCH_CENTER[1], SAINT_ROCH_CENTER[0]],
        zoom: 15,
        minZoom: 11,
        maxZoom: 19,
        maxBounds: L.latLngBounds([s - 0.3, w - 0.45], [n + 0.3, e + 0.45]), // toute la région de Québec (on peut partir de loin)
        zoomControl: false,
      });
      if (window.matchMedia("(min-width: 768px)").matches) L.control.zoom({ position: "topright" }).addTo(map);
      map.attributionControl.setPrefix(false).addAttribution(SAINT_ROCH_ATTRIBUTION);
      addBaseTiles(L, map);
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#7552de";
      L.polygon(RING, { color: accent, weight: 2, dashArray: "6 6", fillColor: accent, fillOpacity: 0.04, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds(RING), { padding: [16, 16], paddingBottomRight: [16, padRef.current()] });

      routeRef.current = L.layerGroup().addTo(map);
      dataRef.current = L.layerGroup().addTo(map);
      eventsRef.current = L.layerGroup().addTo(map);
      map.on("zoomend", () => setZoom(map.getZoom()));
      map.on("click", () => onSelectRef.current(null));
      mapRef.current = map;
      setZoom(map.getZoom());
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 2) Stationnements, vélos, arrêts de bus, bornes (les plus petits seulement quand on zoome)
  useEffect(() => {
    const L = LRef.current;
    const group = dataRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    if (!layers) return;
    const add = (lat: number, lng: number, html: string, size: number, title: string, onClick: () => void, z = 0) =>
      L.marker([lat, lng], { icon: L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }), title, riseOnHover: true, zIndexOffset: z, keyboard: true })
        .on("click", (ev) => {
          L.DomEvent.stopPropagation(ev);
          onClick();
        })
        .addTo(group);

    if (show.bus && zoom >= 14) {
      for (const b of layers.busStops) add(b.lat, b.lng, `<div class="ya-bus${b.id === selectedId ? " is-on" : ""}"></div>`, zoom >= 16 ? 18 : 12, `Arrêt ${b.name}`, () => onSelectRef.current({ kind: "bus", item: b }));
    }
    if (show.velo && zoom >= 16) {
      for (const r of layers.bikeRacks) add(r.lat, r.lng, '<div class="ya-rack"></div>', 10, "Support à vélos", () => {});
    }
    if (show.bornes) {
      for (const c of layers.chargers) add(c.lat, c.lng, `<div class="ya-ev${c.id === selectedId ? " is-on" : ""}">⚡</div>`, 24, c.name, () => onSelectRef.current({ kind: "charger", item: c }));
    }
    if (show.velo) {
      for (const b of layers.bikeStations) {
        const n = b.bikes ?? "";
        add(b.lat, b.lng, `<div class="ya-bike${b.bikes === 0 ? " is-empty" : ""}${b.id === selectedId ? " is-on" : ""}"><span>🚲</span><b>${n}</b></div>`, 30, `àVélo ${b.name}`, () => onSelectRef.current({ kind: "bike", item: b }), 100);
      }
    }
    if (show.parkings) {
      for (const p of layers.parkings) {
        if (p.kind === "inconnu" && zoom < 16) continue;
        if (p.kind === "clients" && zoom < 15) continue;
        const on = p.id === selectedId || p.id === chosenParkingId;
        const small = p.kind === "inconnu" || p.kind === "clients";
        const cap = p.capacity && !small ? `<i>${p.estimated ? "≈" : ""}${p.capacity}</i>` : "";
        add(p.lat, p.lng, `<div class="ya-p${small ? " ya-p--sm" : ""}${on ? " is-on" : ""}" style="--c:${PARKING_COLOR[p.kind]}"><b>P</b>${cap}</div>`, small ? 20 : 28, p.name, () => onSelectRef.current({ kind: "parking", item: p }), on ? 900 : p.kind === "ville" ? 300 : 200);
      }
    }
  }, [ready, layers, show, zoom, selectedId, chosenParkingId]);

  // 3) Activités et événements : pastilles numérotées, rouges = en direct, violettes = à venir
  useEffect(() => {
    const L = LRef.current;
    const group = eventsRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    if (!show.events) return;
    // même lieu : on décale un peu les pastilles pour toutes les voir
    const seen = new Map<string, number>();
    events.forEach((ev, i) => {
      const key = `${ev.lat.toFixed(4)},${ev.lng.toFixed(4)}`;
      const k = seen.get(key) ?? 0;
      seen.set(key, k + 1);
      const angle = k * 2.1;
      const lat = ev.lat + (k ? Math.sin(angle) * 0.00022 * Math.ceil(k / 3) : 0);
      const lng = ev.lng + (k ? Math.cos(angle) * 0.0003 * Math.ceil(k / 3) : 0);
      const on = ev.id === selectedId;
      L.marker([lat, lng], {
        icon: L.divIcon({ html: `<div class="ya-evt${ev.status === "live" ? " is-live" : ""}${on ? " is-on" : ""}"><span>${i + 1}</span></div>`, className: "", iconSize: [34, 42], iconAnchor: [17, 38] }),
        title: ev.title,
        riseOnHover: true,
        zIndexOffset: on ? 2000 : ev.status === "live" ? 1500 : 1000,
      })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRef.current({ kind: "event", item: ev, n: i + 1 });
        })
        .addTo(group);
    });
  }, [ready, events, show.events, selectedId]);

  // 4) Le trajet : départ, arrivée et tracé (couleur du mode ; marche en pointillés ; bus de la couleur de la ligne)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const group = routeRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();
    const pts: [number, number][] = [];
    for (const leg of trip?.legs ?? []) {
      if (leg.coords.length < 2) continue;
      const color = leg.color ?? (leg.mode === "attente" ? "#999" : modeOf(leg.mode).color);
      if (leg.dashed) {
        L.polyline(leg.coords, { color: "#5f6b7a", weight: 4, dashArray: "1 9", lineCap: "round", interactive: false }).addTo(group);
      } else {
        L.polyline(leg.coords, { color: "#fff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }).addTo(group);
        L.polyline(leg.coords, { color, weight: 6, lineCap: "round", lineJoin: "round", interactive: false, className: "ya-route" }).addTo(group);
      }
      pts.push(...leg.coords);
    }
    if (from) {
      L.marker([from.lat, from.lng], { icon: L.divIcon({ html: '<div class="ya-from"></div>', className: "", iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false, zIndexOffset: 3000 }).addTo(group);
      pts.push([from.lat, from.lng]);
    }
    if (to) {
      L.marker([to.lat, to.lng], { icon: L.divIcon({ html: '<div class="ya-to"><span></span></div>', className: "", iconSize: [36, 46], iconAnchor: [18, 44] }), interactive: false, zIndexOffset: 3000 }).addTo(group);
      pts.push([to.lat, to.lng]);
    }
    // On recadre seulement quand le trajet (ou le point) change, pas à chaque mise à jour
    const key = trip ? `${trip.mode}|${trip.legs.map((l) => l.coords.length).join(",")}|${from?.lat},${to?.lat}` : `${from?.lat},${from?.lng}|${to?.lat},${to?.lng}`;
    if (key === fitted.current || !pts.length) return;
    fitted.current = key;
    const pad = padRef.current();
    if (pts.length === 1) map.flyTo(pts[0], Math.max(map.getZoom(), 16), { duration: 0.6 });
    else map.flyToBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 40], paddingBottomRight: [40, pad + 20], duration: 0.7, maxZoom: 17 });
  }, [ready, trip, from, to]);

  return <div ref={box} className="absolute inset-0 z-0 bg-soft" role="application" aria-label="Carte : stationnements, vélos, bus et trajet vers Saint-Roch" />;
}
