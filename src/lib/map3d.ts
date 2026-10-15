"use client";

import type { Map as MlMap, Marker } from "maplibre-gl";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_CENTER, SAINT_ROCH_GEOMETRY } from "./saint-roch-boundary";

// Cartes en 3D (MapLibre + OpenFreeMap, gratuit et sans clé) : bâtiments de Saint-Roch en volume, carte inclinable.
// Les pastilles (P, vélos, événements…) sont des éléments HTML : mêmes styles que les cartes 2D (classes .ya-* de globals.css).
export type MapLib = typeof import("maplibre-gl");
export const PITCH_3D = 58;
export const BEARING_3D = -18;

export async function createMap3D(container: HTMLElement, opts: { interactive?: boolean; controls?: boolean; zoom?: number; cooperative?: boolean } = {}) {
  const mod = await import("maplibre-gl");
  const maplibregl: MapLib = (mod as unknown as { default?: MapLib }).default ?? mod; // paquet UMD : export par défaut selon l'outil
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const map = new maplibregl.Map({
    container,
    style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "liberty"}`,
    center: SAINT_ROCH_CENTER,
    zoom: opts.zoom ?? 14.7,
    pitch: PITCH_3D,
    bearing: BEARING_3D,
    maxPitch: 75,
    maxBounds: [[-71.75, 46.6], [-70.9, 47.15]], // région de Québec
    interactive: opts.interactive ?? true,
    attributionControl: { compact: true, customAttribution: SAINT_ROCH_ATTRIBUTION },
    cooperativeGestures: opts.cooperative ?? false, // sur une page qui défile : deux doigts (ou Ctrl + molette) pour bouger la carte
  });
  if (opts.controls) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  await new Promise<void>((resolve) => map.once("load", () => resolve()));
  addBuildings3D(map, dark);
  addBoundary(map);
  return { maplibregl, map };
}

/** Bâtiments en volume (hauteur réelle d'OpenStreetMap) sous les noms de rues. */
function addBuildings3D(map: MlMap, dark: boolean) {
  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  for (const l of map.getStyle().layers) if (l.type === "fill-extrusion") map.removeLayer(l.id); // on remplace celle du style
  map.addLayer(
    {
      id: "ya-buildings-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, dark ? "#2b2a36" : "#ebe7f5", 40, dark ? "#3b3852" : "#cfc6ee"],
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, ["coalesce", ["get", "render_height"], 6]],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.88,
      },
    },
    firstSymbol,
  );
}

/** Limite officielle de Saint-Roch : léger voile violet et contour en pointillés. */
function addBoundary(map: MlMap) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#7552de";
  map.addSource("saint-roch", { type: "geojson", data: { type: "Feature", properties: {}, geometry: SAINT_ROCH_GEOMETRY as unknown as GeoJSON.Polygon } });
  map.addLayer({ id: "saint-roch-fill", type: "fill", source: "saint-roch", paint: { "fill-color": accent, "fill-opacity": 0.06 } });
  map.addLayer({ id: "saint-roch-line", type: "line", source: "saint-roch", paint: { "line-color": accent, "line-width": 2.5, "line-dasharray": [2, 2] } });
}

/** Pastille HTML cliquable (le clic ne traverse pas jusqu'à la carte). */
export function htmlMarker(maplibregl: MapLib, map: MlMap, at: { lat: number; lng: number }, html: string, opts: { title?: string; onClick?: () => void; anchor?: "center" | "bottom"; z?: number } = {}): Marker {
  const el = document.createElement("div");
  el.innerHTML = html;
  if (opts.title) el.title = opts.title;
  if (opts.z) el.style.zIndex = String(opts.z);
  if (opts.onClick) {
    el.style.cursor = "pointer";
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onClick!();
    });
  }
  return new maplibregl.Marker({ element: el, anchor: opts.anchor ?? "center" }).setLngLat([at.lng, at.lat]).addTo(map);
}

/** Boîte qui contient tous les points [lat, lng]. */
export function boundsOf(pts: [number, number][]): [[number, number], [number, number]] {
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}
