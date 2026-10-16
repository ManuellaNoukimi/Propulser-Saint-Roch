"use client";

import type { Map as MlMap, Marker } from "maplibre-gl";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_CENTER, SAINT_ROCH_GEOMETRY } from "./saint-roch-boundary";

// Cartes en 3D (MapLibre + OpenFreeMap, gratuit et sans clé) : bâtiments de Saint-Roch en volume, carte inclinable, vue satellite HD.
// Les pastilles (P, vélos, événements…) sont des éléments HTML : mêmes styles que les cartes 2D (classes .ya-* de globals.css).
export type MapLib = typeof import("maplibre-gl");
export const PITCH_3D = 58;
export const BEARING_3D = -18;

export const SATELLITE_SOURCE_ID = "esri-satellite-source";
export const SATELLITE_LAYER_ID = "esri-satellite-layer";
export const SATELLITE_TILES_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export async function createMap3D(
  container: HTMLElement,
  opts: {
    interactive?: boolean;
    controls?: boolean;
    zoom?: number;
    cooperative?: boolean;
    light?: boolean;
    signal?: AbortSignal;
    satellite?: boolean;
  } = {},
) {
  const mod = await import("maplibre-gl");
  const maplibregl: MapLib = (mod as unknown as { default?: MapLib }).default ?? mod; // paquet UMD : export par défaut selon l'outil
  if (opts.signal?.aborted) throw new DOMException("Chargement annulé", "AbortError");
  const dark = !opts.light && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const map = new maplibregl.Map({
    container,
    style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "liberty"}`,
    center: SAINT_ROCH_CENTER,
    zoom: opts.zoom ?? 14.7,
    pitch: PITCH_3D,
    bearing: BEARING_3D,
    maxPitch: 80,
    maxZoom: 22,
    maxBounds: [[-71.75, 46.6], [-70.9, 47.15]], // région de Québec
    interactive: opts.interactive ?? true,
    canvasContextAttributes: { antialias: true },
    attributionControl: { compact: true, customAttribution: SAINT_ROCH_ATTRIBUTION },
    cooperativeGestures: opts.cooperative ?? false, // sur une page qui défile : deux doigts (ou Ctrl + molette) pour bouger la carte
    pitchWithRotate: true,
    dragRotate: true,
    touchPitch: true,
    touchZoomRotate: true,
    fadeDuration: 250,
    locale: {
      "NavigationControl.ZoomIn": "Zoomer",
      "NavigationControl.ZoomOut": "Dézoomer",
      "NavigationControl.ResetBearing": "Réorienter vers le nord",
      "AttributionControl.ToggleAttribution": "Sources cartographiques",
    },
  });
  if (opts.controls) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  try {
    // On continue dès que le STYLE est prêt (« style.load ») : inutile d'attendre toutes les tuiles (« load »), qui
    // peut ne jamais arriver si l'onglet est en arrière-plan (le navigateur suspend le dessin) ou si une tuile traîne.
    // Le délai ne compte que lorsque l'onglet est visible ; à l'échéance, si le style est là, on continue quand même.
    await new Promise<void>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        map.off("load", loaded);
        map.off("style.load", loaded);
        document.removeEventListener("visibilitychange", arm);
        opts.signal?.removeEventListener("abort", aborted);
        if (error) reject(error);
        else resolve();
      };
      const loaded = () => finish();
      const aborted = () => finish(new DOMException("Chargement annulé", "AbortError"));
      const expire = () => (map.isStyleLoaded() ? finish() : finish(new Error("Délai de chargement de la carte dépassé")));
      function arm() {
        clearTimeout(timeout);
        if (!document.hidden) timeout = setTimeout(expire, 20_000);
      }
      map.once("load", loaded);
      map.once("style.load", loaded);
      document.addEventListener("visibilitychange", arm);
      arm();
      opts.signal?.addEventListener("abort", aborted, { once: true });
      if (opts.signal?.aborted) aborted();
      else if (map.isStyleLoaded()) loaded();
    });

    // 1) Ciel & horizon immersif en 3D
    try {
      if (typeof map.setSky === "function") {
        map.setSky({
          "sky-color": dark ? "#0f172a" : "#7dd3fc",
          "horizon-color": dark ? "#1e293b" : "#e0f2fe",
          "fog-color": dark ? "#0f172a" : "#bae6fd",
          "fog-ground-blend": 0.45,
          "horizon-fog-blend": 0.7,
          "sky-horizon-blend": 0.8,
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 12, 0.1, 16, 0.85],
        });
      }
    } catch {
      // Ignorer si setSky non supporté
    }

    // 2) Fond Satellite
    addSatelliteSourceAndLayer(map, opts.satellite ?? false);

    // 3) Bâtiments 3D sous les noms de rues (visibles en mode plan, masqués en satellite)
    addBuildings3D(map, dark, opts.satellite ?? false);

    // 4) Limite officielle de Saint-Roch
    addBoundary(map);
  } catch (error) {
    map.remove();
    throw error;
  }
  return { maplibregl, map };
}

/** Ajoute la source et couche satellite sous les bâtiments et étiquettes */
function addSatelliteSourceAndLayer(map: MlMap, active: boolean) {
  if (!map.getSource(SATELLITE_SOURCE_ID)) {
    map.addSource(SATELLITE_SOURCE_ID, {
      type: "raster",
      tiles: [SATELLITE_TILES_URL],
      tileSize: 256,
      maxzoom: 20,
      attribution: "Imagerie &copy; Esri, Maxar, Earthstar Geographics",
    });
  }

  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    map.addLayer(
      {
        id: SATELLITE_LAYER_ID,
        type: "raster",
        source: SATELLITE_SOURCE_ID,
        layout: {
          visibility: active ? "visible" : "none",
        },
        paint: {
          "raster-opacity": active ? 1 : 0,
          "raster-fade-duration": 150,
        },
      },
      firstSymbol,
    );
  }
}

/** Active ou désactive la vue satellite avec transition fluide */
export function setSatelliteMode(map: MlMap, active: boolean) {
  if (!map || !map.isStyleLoaded()) return;

  // 1) Afficher / masquer la couche satellite
  if (map.getLayer(SATELLITE_LAYER_ID)) {
    map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", "visible");
    map.setPaintProperty(SATELLITE_LAYER_ID, "raster-opacity", active ? 1 : 0);
  }

  // 2) En mode satellite : on MASQUE complètement les volumes 3D pour éviter tout bloc noir bizarre
  //    En mode plan : on les réaffiche normalement
  if (map.getLayer("ya-buildings-3d")) {
    map.setLayoutProperty("ya-buildings-3d", "visibility", active ? "none" : "visible");
  }

  // 3) Voile de Saint-Roch retiré en mode satellite
  if (map.getLayer("saint-roch-fill")) {
    map.setPaintProperty("saint-roch-fill", "fill-opacity", active ? 0 : 0.06);
  }

  if (!active) {
    setTimeout(() => {
      // La carte a pu être fermée entre-temps (changement de page) : plus de style, on ne touche à rien.
      if (!map.isStyleLoaded()) return;
      try {
        if (map.getLayer(SATELLITE_LAYER_ID) && map.getPaintProperty(SATELLITE_LAYER_ID, "raster-opacity") === 0) {
          map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", "none");
        }
      } catch {
        // carte retirée pendant la transition
      }
    }, 400);
  }
}

/** Vérifie si le mode satellite est actif */
export function isSatelliteMode(map: MlMap): boolean {
  if (!map || !map.isStyleLoaded() || !map.getLayer(SATELLITE_LAYER_ID)) return false;
  const op = map.getPaintProperty(SATELLITE_LAYER_ID, "raster-opacity");
  return typeof op === "number" && op > 0.1;
}

/** Bascule rapidement entre 3D et vue à plat avec animation douce */
export function set3DView(map: MlMap, is3d: boolean, duration = 650) {
  if (!map) return;
  map.easeTo({
    pitch: is3d ? PITCH_3D : 0,
    bearing: is3d ? BEARING_3D : 0,
    duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration,
  });
}

/** Bâtiments en volume (hauteur réelle d'OpenStreetMap) sous les noms de rues. */
function addBuildings3D(map: MlMap, dark: boolean, isSatellite = false) {
  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  for (const l of map.getStyle().layers) if (l.type === "fill-extrusion") map.removeLayer(l.id); // on remplace celle du style
  map.addLayer(
    {
      id: "ya-buildings-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      layout: {
        visibility: isSatellite ? "none" : "visible",
      },
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "render_height"], 6],
          0,
          dark ? "#2b2a36" : "#ebe7f5",
          40,
          dark ? "#3b3852" : "#cfc6ee",
        ],
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
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#0096d6";
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
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    if (opts.title) el.setAttribute("aria-label", opts.title);
    el.style.cursor = "pointer";
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onClick!();
    });
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
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

/** Échappe les caractères HTML basiques pour sécurité */
function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Marqueur haute visibilité : onde radar pulsée (« ping ») + épingle 3D + badge du lieu */
export function pingMarkerHtml(label?: string, detail?: string): string {
  const safeLabel = label ? escapeHtml(label).slice(0, 60) : "";
  const safeDetail = detail ? escapeHtml(detail).slice(0, 50) : "";

  return `
<div class="ya-ping-destination" role="button" aria-label="${safeLabel || "Destination"}">
  <div class="ya-ping-radar" aria-hidden="true">
    <div class="ya-ping-ring ya-ping-ring-1"></div>
    <div class="ya-ping-ring ya-ping-ring-2"></div>
    <div class="ya-ping-ring ya-ping-ring-3"></div>
    <div class="ya-ping-core"></div>
  </div>
  <div class="ya-ping-pin-wrapper">
    <div class="ya-ping-pin">
      <svg viewBox="0 0 40 52" class="ya-ping-pin-svg" aria-hidden="true">
        <defs>
          <linearGradient id="ya-pin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff334b" />
            <stop offset="100%" stop-color="#cb0024" />
          </linearGradient>
          <filter id="ya-pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.4" />
          </filter>
        </defs>
        <path d="M20 2C10.1 2 2 10.1 2 20c0 13 18 30 18 30s18-17 18-30C38 10.1 29.9 2 20 2z" fill="url(#ya-pin-grad)" stroke="#ffffff" stroke-width="2.6" filter="url(#ya-pin-shadow)" />
        <circle cx="20" cy="19" r="7.5" fill="#ffffff" />
        <circle cx="20" cy="19" r="4.2" fill="#cb0024" />
      </svg>
    </div>
    ${safeLabel ? `
    <div class="ya-ping-tooltip">
      <div class="ya-ping-badge">
        <span class="ya-ping-badge-icon"><img src="/icons/marker-pin.svg" width="16" height="16" alt="" /></span>
        <div class="ya-ping-badge-text">
          <span class="ya-ping-title">${safeLabel}</span>
          ${safeDetail ? `<span class="ya-ping-sub">${safeDetail}</span>` : ""}
        </div>
      </div>
    </div>
    ` : ""}
  </div>
</div>`.trim();
}

/** Marqueur de départ : point balise bleu éclatant avec onde douce */
export function fromMarkerHtml(label?: string): string {
  const safeLabel = label ? escapeHtml(label).slice(0, 50) : "";
  return `
<div class="ya-from-marker" role="button" aria-label="${safeLabel || "Point de départ"}">
  <div class="ya-from-ring"></div>
  <div class="ya-from-dot"></div>
  ${safeLabel ? `
  <div class="ya-from-tooltip">
    <span class="ya-from-badge">Départ : ${safeLabel}</span>
  </div>
  ` : ""}
</div>`.trim();
}

/** Marqueur pour un élément ciblé / sélectionné */
export function focusMarkerHtml(label?: string): string {
  const safeLabel = label ? escapeHtml(label).slice(0, 50) : "";
  return `
<div class="ya-focus-ping" role="button" aria-label="${safeLabel || "Lieu sélectionné"}">
  <div class="ya-focus-radar" aria-hidden="true">
    <div class="ya-focus-ring"></div>
    <div class="ya-focus-dot"></div>
  </div>
  ${safeLabel ? `
  <div class="ya-focus-tooltip">
    <span class="ya-focus-badge">${safeLabel}</span>
  </div>
  ` : ""}
</div>`.trim();
}

/**
 * Retire les « P » de la carte de fond : sur les cartes qui dessinent leurs propres stationnements (cliquables),
 * on n'en garde qu'un par stationnement.
 */
export function hideBaseParkings(map: MlMap) {
  for (const l of map.getStyle().layers) {
    if (l.type !== "symbol" || !("source-layer" in l) || l["source-layer"] !== "poi") continue;
    try {
      const noParking = ["!=", ["get", "class"], "parking"];
      map.setFilter(l.id, (l.filter ? ["all", l.filter, noParking] : noParking) as Parameters<MlMap["setFilter"]>[1]);
    } catch {
      // couche au format ancien : on la laisse telle quelle
    }
  }
}
