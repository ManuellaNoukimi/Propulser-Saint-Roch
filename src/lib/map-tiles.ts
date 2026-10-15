import type * as Leaflet from "leaflet";

// Fond de carte SANS clé d'API (CARTO demande maintenant une clé : tuiles « API KEY REQUIRED »).
// Clair : Esri World Street Map ; sombre : Esri Dark Gray Canvas (tuiles natives jusqu'au zoom 16, agrandies au-delà).
export function addBaseTiles(L: typeof Leaflet, map: Leaflet.Map) {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const base = "https://server.arcgisonline.com/ArcGIS/rest/services";
  return L.tileLayer(dark ? `${base}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}` : `${base}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, {
    maxZoom: 20,
    maxNativeZoom: dark ? 16 : 19,
    attribution: "Fond de carte &copy; Esri, HERE, Garmin, &copy; contributeurs OpenStreetMap",
  }).addTo(map);
}
