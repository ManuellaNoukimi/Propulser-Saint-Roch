"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { BEARING_3D, PITCH_3D, boundsOf, createMap3D, htmlMarker, type MapLib } from "@/lib/map3d";
import { PARKING_COLOR, modeOf } from "@/lib/y-aller-ui";
import type { BikeStation, BusStop, Charger, GoEvent, LatLng, Layers, Parking, Trip } from "@/lib/y-aller-types";

export type Show = { parkings: boolean; velo: boolean; bus: boolean; bornes: boolean; events: boolean };
export type Selected =
  | { kind: "parking"; item: Parking }
  | { kind: "bike"; item: BikeStation }
  | { kind: "bus"; item: BusStop }
  | { kind: "charger"; item: Charger }
  | { kind: "event"; item: GoEvent; n: number };

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Carte « Y aller » en 3D : bâtiments en volume, stationnements, vélos, bus, bornes, événements numérotés et trajet tracé. */
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
  const mapRef = useRef<MlMap | null>(null);
  const libRef = useRef<MapLib | null>(null);
  const dataMarkers = useRef<Marker[]>([]);
  const eventMarkers = useRef<Marker[]>([]);
  const routeMarkers = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const padRef = useRef(padBottom);
  const fitted = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(15);
  const [is3d, setIs3d] = useState(true);

  useEffect(() => {
    onSelectRef.current = onSelect;
    padRef.current = padBottom;
  }, [onSelect, padBottom]);

  // 1) Création de la carte 3D (MapLibre seulement dans le navigateur)
  useEffect(() => {
    let cancelled = false;
    let created: MlMap | null = null;
    (async () => {
      if (!box.current) return;
      const { maplibregl, map } = await createMap3D(box.current, { controls: window.matchMedia("(min-width: 768px)").matches });
      created = map;
      if (cancelled) return map.remove();
      libRef.current = maplibregl;
      // Tracé du trajet : contour blanc + couleur du mode ; marche en pointillés
      map.addSource("route", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "route-casing", type: "line", source: "route", filter: ["!=", ["get", "dashed"], true], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.95 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", filter: ["!=", ["get", "dashed"], true], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": 6 } });
      map.addLayer({ id: "route-walk", type: "line", source: "route", filter: ["==", ["get", "dashed"], true], layout: { "line-cap": "round" }, paint: { "line-color": "#5f6b7a", "line-width": 4, "line-dasharray": [0.2, 2] } });
      map.on("zoomend", () => setZoom(map.getZoom()));
      map.on("click", () => onSelectRef.current(null));
      map.on("pitchend", () => setIs3d(map.getPitch() > 10));
      // Petite entrée animée : on tourne doucement autour du quartier
      map.easeTo({ bearing: BEARING_3D + 12, duration: 2200 });
      mapRef.current = map;
      setZoom(map.getZoom());
      setReady(true);
    })();
    return () => {
      cancelled = true;
      (mapRef.current ?? created)?.remove();
      mapRef.current = null;
    };
  }, []);

  // 2) Stationnements, vélos, arrêts de bus, bornes (les plus petits seulement quand on zoome)
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    dataMarkers.current.forEach((m) => m.remove());
    const list: Marker[] = [];
    dataMarkers.current = list;
    if (!layers) return;
    const add = (p: LatLng, html: string, title: string, onClick?: () => void, z = 1) => list.push(htmlMarker(L, map, p, html, { title, onClick, z }));

    if (show.bus && zoom >= 14) {
      const size = zoom >= 16 ? 18 : 12;
      for (const b of layers.busStops) add(b, `<div class="ya-bus${b.id === selectedId ? " is-on" : ""}" style="width:${size}px;height:${size}px"></div>`, `Arrêt ${b.name}`, () => onSelectRef.current({ kind: "bus", item: b }));
    }
    if (show.velo && zoom >= 16) for (const r of layers.bikeRacks) add(r, '<div class="ya-rack"></div>', "Support à vélos");
    if (show.bornes) for (const c of layers.chargers) add(c, `<div class="ya-ev${c.id === selectedId ? " is-on" : ""}">⚡</div>`, c.name, () => onSelectRef.current({ kind: "charger", item: c }));
    if (show.velo) {
      for (const b of layers.bikeStations) {
        add(b, `<div class="ya-bike${b.bikes === 0 ? " is-empty" : ""}${b.id === selectedId ? " is-on" : ""}"><span>🚲</span><b>${b.bikes ?? ""}</b></div>`, `àVélo ${b.name}`, () => onSelectRef.current({ kind: "bike", item: b }), 2);
      }
    }
    if (show.parkings) {
      for (const p of layers.parkings) {
        if (p.kind === "inconnu" && zoom < 16) continue;
        if (p.kind === "clients" && zoom < 15) continue;
        const on = p.id === selectedId || p.id === chosenParkingId;
        const small = p.kind === "inconnu" || p.kind === "clients";
        const cap = p.capacity && !small ? `<i>${p.estimated ? "≈" : ""}${p.capacity}</i>` : "";
        add(p, `<div class="ya-p${small ? " ya-p--sm" : ""}${on ? " is-on" : ""}" style="--c:${PARKING_COLOR[p.kind]}"><b>P</b>${cap}</div>`, p.name, () => onSelectRef.current({ kind: "parking", item: p }), on ? 9 : p.kind === "ville" ? 4 : 3);
      }
    }
  }, [ready, layers, show, zoom, selectedId, chosenParkingId]);

  // 3) Activités et événements : gouttes numérotées, rouges = en direct, violettes = à venir
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    eventMarkers.current.forEach((m) => m.remove());
    eventMarkers.current = [];
    if (!show.events) return;
    const seen = new Map<string, number>(); // même lieu : on décale un peu les pastilles
    events.forEach((ev, i) => {
      const key = `${ev.lat.toFixed(4)},${ev.lng.toFixed(4)}`;
      const k = seen.get(key) ?? 0;
      seen.set(key, k + 1);
      const at = { lat: ev.lat + (k ? Math.sin(k * 2.1) * 0.00022 * Math.ceil(k / 3) : 0), lng: ev.lng + (k ? Math.cos(k * 2.1) * 0.0003 * Math.ceil(k / 3) : 0) };
      const on = ev.id === selectedId;
      eventMarkers.current.push(
        htmlMarker(L, map, at, `<div class="ya-evt${ev.status === "live" ? " is-live" : ""}${on ? " is-on" : ""}"><span>${i + 1}</span></div>`, {
          title: ev.title,
          anchor: "bottom",
          z: on ? 30 : ev.status === "live" ? 20 : 10,
          onClick: () => onSelectRef.current({ kind: "event", item: ev, n: i + 1 }),
        }),
      );
    });
  }, [ready, events, show.events, selectedId]);

  // 4) Le trajet : tracé, départ (point bleu), arrivée (goutte) et cadrage en vue inclinée
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const features: GeoJSON.Feature[] = (trip?.legs ?? [])
      .filter((leg) => leg.coords.length >= 2)
      .map((leg) => ({
        type: "Feature",
        properties: { dashed: !!leg.dashed, color: leg.color ?? (leg.mode === "attente" ? "#999" : modeOf(leg.mode).color) },
        geometry: { type: "LineString", coordinates: leg.coords.map(([lat, lng]) => [lng, lat]) },
      }));
    (map.getSource("route") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    routeMarkers.current.forEach((m) => m.remove());
    routeMarkers.current = [];
    const pts: [number, number][] = (trip?.legs ?? []).flatMap((l) => l.coords);
    if (from) {
      routeMarkers.current.push(htmlMarker(L, map, from, '<div class="ya-from"></div>', { z: 40 }));
      pts.push([from.lat, from.lng]);
    }
    if (to) {
      routeMarkers.current.push(htmlMarker(L, map, to, '<div class="ya-to"><span></span></div>', { anchor: "bottom", z: 40 }));
      pts.push([to.lat, to.lng]);
    }
    const key = trip ? `${trip.mode}|${trip.legs.map((l) => l.coords.length).join(",")}|${from?.lat},${to?.lat}` : `${from?.lat},${from?.lng}|${to?.lat},${to?.lng}`;
    if (key === fitted.current || !pts.length) return;
    fitted.current = key;
    const pad = padRef.current();
    if (pts.length === 1) map.flyTo({ center: [pts[0][1], pts[0][0]], zoom: Math.max(map.getZoom(), 16.3), duration: 1200 });
    else map.fitBounds(boundsOf(pts), { padding: { top: 70, left: 50, right: 50, bottom: pad + 30 }, maxZoom: 17, duration: 1200 });
  }, [ready, trip, from, to]);

  function toggle3d() {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3d;
    setIs3d(next);
    map.easeTo({ pitch: next ? PITCH_3D : 0, bearing: next ? BEARING_3D : 0, duration: 900 });
  }

  return (
    <>
      <div ref={box} className="absolute inset-0 z-0 bg-soft" role="application" aria-label="Carte 3D : stationnements, vélos, bus et trajet vers Saint-Roch" />
      <button type="button" onClick={toggle3d} aria-pressed={is3d} aria-label={is3d ? "Passer en vue 2D" : "Passer en vue 3D"}
        className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-line bg-bg/95 text-sm font-black shadow-md backdrop-blur transition active:scale-90 md:right-14 md:top-4">
        {is3d ? "2D" : "3D"}
      </button>
    </>
  );
}
