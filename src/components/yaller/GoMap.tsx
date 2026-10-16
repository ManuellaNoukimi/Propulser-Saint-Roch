"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./map3d.css";
import "./travel-map.css";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Cuboid, Globe, LocateFixed, LoaderCircle, Map as MapIcon } from "lucide-react";
import { SAINT_ROCH_CENTER } from "@/lib/saint-roch-boundary";
import {
  BEARING_3D,
  PITCH_3D,
  boundsOf,
  createMap3D,
  focusMarkerHtml,
  fromMarkerHtml,
  htmlMarker,
  pingMarkerHtml,
  set3DView,
  setSatelliteMode,
  type MapLib,
} from "@/lib/map3d";
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

type PlaceLike = LatLng & { label?: string; detail?: string | null; name?: string; title?: string };

/** Carte « Y aller » en 3D : bâtiments en volume, satellite HD, stationnements, vélos, bus, bornes, événements numérotés et trajet tracé. */
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
  bottomInset = 0,
  focusedPlace = null,
}: {
  layers: Layers | null;
  show: Show;
  events: GoEvent[];
  from: PlaceLike | null;
  to: PlaceLike | null;
  trip: Trip | null;
  selectedId: string | null;
  chosenParkingId: string | null;
  onSelect: (s: Selected | null) => void;
  padBottom: () => number;
  bottomInset?: number;
  focusedPlace?: PlaceLike | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const libRef = useRef<MapLib | null>(null);
  const dataMarkers = useRef<Marker[]>([]);
  const eventMarkers = useRef<Marker[]>([]);
  const routeMarkers = useRef<Marker[]>([]);
  const focusMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const padRef = useRef(padBottom);
  const fitted = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(15);
  const [is3d, setIs3d] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const initialSatellite = useRef(isSatellite);
  const detailZoom = zoom >= 17 ? 17 : zoom >= 16 ? 16 : zoom >= 14 ? 14 : 11;

  useEffect(() => {
    onSelectRef.current = onSelect;
    padRef.current = padBottom;
  }, [onSelect, padBottom]);

  // 1) Création de la carte 3D (MapLibre seulement dans le navigateur)
  useEffect(() => {
    let cancelled = false;
    let created: MlMap | null = null;
    let observer: ResizeObserver | undefined;
    const controller = new AbortController();
    (async () => {
      if (!box.current) return;
      const { maplibregl, map } = await createMap3D(box.current, {
        controls: true,
        light: true,
        satellite: initialSatellite.current,
        signal: controller.signal,
      });
      created = map;
      if (cancelled) return map.remove();
      libRef.current = maplibregl;
      fitted.current = "";
      // Tracé du trajet : contour blanc + couleur du mode ; marche en pointillés
      map.addSource("route", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "route-casing", type: "line", source: "route", filter: ["!=", ["get", "dashed"], true], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.95 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", filter: ["!=", ["get", "dashed"], true], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": 6 } });
      map.addLayer({ id: "route-walk", type: "line", source: "route", filter: ["==", ["get", "dashed"], true], layout: { "line-cap": "round" }, paint: { "line-color": "#5f6b7a", "line-width": 4, "line-dasharray": [0.2, 2] } });
      map.on("zoomend", () => setZoom(map.getZoom()));
      map.on("click", () => onSelectRef.current(null));
      map.on("pitchend", () => setIs3d(map.getPitch() > 10));
      observer = new ResizeObserver(() => map.resize());
      if (box.current) observer.observe(box.current);
      mapRef.current = map;
      setZoom(map.getZoom());
      setIs3d(map.getPitch() > 10);
      setReady(true);
    })().catch((error: unknown) => {
      if (cancelled) return;
      console.error("Carte 3D indisponible:", error);
      created?.remove();
      mapRef.current = null;
      setReady(false);
      setFailed(true);
    });
    return () => {
      cancelled = true;
      controller.abort();
      observer?.disconnect();
      focusMarkerRef.current?.remove();
      focusMarkerRef.current = null;
      (mapRef.current ?? created)?.remove();
      mapRef.current = null;
    };
  }, [attempt]);

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

    if (show.bus && detailZoom >= 14) {
      const size = detailZoom >= 16 ? 18 : 12;
      for (const b of layers.busStops) add(b, `<div class="ya-bus${b.id === selectedId ? " is-on" : ""}" style="width:${size}px;height:${size}px"></div>`, `Arrêt ${b.name}`, () => onSelectRef.current({ kind: "bus", item: b }));
    }
    if (show.velo && detailZoom >= 16) for (const r of layers.bikeRacks) add(r, '<div class="ya-rack"></div>', "Support à vélos");
    if (show.bornes) for (const c of layers.chargers) add(c, `<div class="ya-ev${c.id === selectedId ? " is-on" : ""}">⚡</div>`, c.name, () => onSelectRef.current({ kind: "charger", item: c }));
    if (show.velo) {
      for (const b of layers.bikeStations) {
        add(b, `<div class="ya-bike${b.bikes === 0 ? " is-empty" : ""}${b.id === selectedId ? " is-on" : ""}"><span>🚲</span><b>${b.bikes ?? ""}</b></div>`, `àVélo ${b.name}`, () => onSelectRef.current({ kind: "bike", item: b }), 2);
      }
    }
    if (show.parkings) {
      for (const p of layers.parkings) {
        const on = p.id === selectedId || p.id === chosenParkingId;
        if (!on && p.kind === "inconnu" && detailZoom < 17) continue;
        if (!on && p.kind === "clients" && detailZoom < 16) continue;
        const small = p.kind === "inconnu" || p.kind === "clients";
        const cap = p.capacity && !small && (detailZoom >= 17 || on) ? `<i>${p.estimated ? "≈" : ""}${p.capacity}</i>` : "";
        add(p, `<div class="ya-p${small ? " ya-p--sm" : ""}${on ? " is-on" : ""}" style="--c:${PARKING_COLOR[p.kind]}"><b>P</b>${cap}</div>`, p.name, () => onSelectRef.current({ kind: "parking", item: p }), on ? 9 : p.kind === "ville" ? 4 : 3);
      }
    }
  }, [ready, layers, show, detailZoom, selectedId, chosenParkingId]);

  // Marqueur lumineux pour le lieu sélectionné / recherché
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    focusMarkerRef.current?.remove();
    focusMarkerRef.current = null;

    if (!focusedPlace) return;

    // Évite d'empiler un marqueur si c'est déjà l'arrivée ou le départ
    const isTo = to && Math.abs(to.lat - focusedPlace.lat) < 0.00008 && Math.abs(to.lng - focusedPlace.lng) < 0.00008;
    const isFrom = from && Math.abs(from.lat - focusedPlace.lat) < 0.00008 && Math.abs(from.lng - focusedPlace.lng) < 0.00008;

    if (!isTo && !isFrom) {
      const placeLabel = focusedPlace.label ?? focusedPlace.name ?? focusedPlace.title ?? "";
      focusMarkerRef.current = htmlMarker(
        L,
        map,
        focusedPlace,
        focusMarkerHtml(placeLabel),
        {
          anchor: "center",
          z: 48,
          title: placeLabel || "Lieu sélectionné",
        },
      );
    }

    map.easeTo({
      center: [focusedPlace.lng, focusedPlace.lat],
      zoom: Math.max(map.getZoom(), 16.4),
      pitch: is3d ? PITCH_3D : 0,
      offset: [0, -padRef.current() / 2],
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500,
    });
  }, [ready, focusedPlace, bottomInset, to, from, is3d]);

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

  // 4) Le trajet : tracé, départ (point bleu), arrivée (logo ping localisation) et cadrage en vue inclinée
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
      routeMarkers.current.push(
        htmlMarker(L, map, from, fromMarkerHtml(from.label), {
          anchor: "center",
          z: 40,
          title: from.label ?? "Point de départ",
          onClick: () => {
            map.easeTo({ center: [from.lng, from.lat], zoom: Math.max(map.getZoom(), 16.5), duration: 600 });
          },
        }),
      );
      pts.push([from.lat, from.lng]);
    }

    if (to) {
      // Marqueur haute visibilité avec radar ping et épingle 3D
      routeMarkers.current.push(
        htmlMarker(L, map, to, pingMarkerHtml(to.label, to.detail ?? undefined), {
          anchor: "bottom",
          z: 60,
          title: to.label ?? "Destination",
          onClick: () => {
            map.easeTo({
              center: [to.lng, to.lat],
              zoom: Math.max(map.getZoom(), 16.8),
              pitch: is3d ? PITCH_3D : 0,
              bearing: is3d ? BEARING_3D : 0,
              offset: [0, -padRef.current() / 2],
              duration: 700,
            });
          },
        }),
      );
      pts.push([to.lat, to.lng]);
    }

    const key = JSON.stringify([from, to, trip?.mode, trip?.legs.map((leg) => leg.coords)]);
    if (key === fitted.current) return;
    fitted.current = key;
    if (!pts.length) return;
    const pad = padRef.current();
    map.fitBounds(boundsOf(pts), { padding: { top: 70, left: 28, right: 64, bottom: pad + 30 }, maxZoom: pts.length === 1 ? 16.5 : 17, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700 });
  }, [ready, trip, from, to, is3d]);

  function setView(next: boolean) {
    const map = mapRef.current;
    if (!map) return;
    setIs3d(next);
    set3DView(map, next);
  }

  function toggleSatellite(next: boolean) {
    const map = mapRef.current;
    if (!map) return;
    setIsSatellite(next);
    setSatelliteMode(map, next);
  }

  function recenter() {
    const map = mapRef.current;
    if (!map) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    if (to) {
      map.easeTo({
        center: [to.lng, to.lat],
        zoom: Math.max(map.getZoom(), 16.6),
        pitch: is3d ? PITCH_3D : 0,
        bearing: is3d ? BEARING_3D : 0,
        offset: [0, -padRef.current() / 2],
        duration,
      });
      return;
    }
    if (focusedPlace) {
      map.easeTo({
        center: [focusedPlace.lng, focusedPlace.lat],
        zoom: Math.max(map.getZoom(), 16.5),
        pitch: is3d ? PITCH_3D : 0,
        offset: [0, -padRef.current() / 2],
        duration,
      });
      return;
    }
    const points: [number, number][] = (trip?.legs ?? []).flatMap((leg) => leg.coords);
    if (from) points.push([from.lat, from.lng]);
    if (points.length) {
      map.fitBounds(boundsOf(points), { padding: { top: 70, left: 28, right: 64, bottom: padRef.current() + 30 }, maxZoom: points.length === 1 ? 16.3 : 17, duration });
    } else {
      map.easeTo({ center: SAINT_ROCH_CENTER, zoom: 14.7, pitch: is3d ? PITCH_3D : 0, offset: [0, -padRef.current() / 2], duration });
    }
  }

  return (
    <div className="ya-3d-map absolute inset-0" style={{ "--ya-map-inset": bottomInset + "px" } as CSSProperties}>
      <div ref={box} className="ya-map3d-canvas z-0 bg-soft" role="application" aria-label="Carte 3D : stationnements, vélos, bus et trajet vers Saint-Roch" />
      <div className="ya-3d-controls" role="group" aria-label="Commandes de la carte">
        <button
          type="button"
          disabled={!ready}
          onClick={() => toggleSatellite(false)}
          aria-pressed={!isSatellite}
          title="Vue Plan"
        >
          <MapIcon size={15} /> Plan
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => toggleSatellite(true)}
          aria-pressed={isSatellite}
          title="Vue Satellite HD"
        >
          <Globe size={15} /> Satellite
        </button>
        <div className="ya-3d-controls-divider" aria-hidden="true" />
        <button
          type="button"
          disabled={!ready}
          onClick={() => setView(!is3d)}
          aria-pressed={is3d}
          title={is3d ? "Passer en vue 2D" : "Passer en vue 3D"}
        >
          <Cuboid size={16} /> 3D
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={recenter}
          aria-label="Recentrer la carte"
          title="Recentrer la carte"
        >
          <LocateFixed size={17} />
        </button>
      </div>
      {!ready && (
        <div className="ya-3d-feedback" role="status">
          {failed ? <><span>Carte indisponible.</span><button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>Réessayer</button></> : <><LoaderCircle size={15} className="animate-spin" /> Chargement de la carte…</>}
        </div>
      )}
    </div>
  );
}
