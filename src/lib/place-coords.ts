import "server-only";
import { searchPlaces } from "./geocode";

// Coordonnées des lieux publics de Saint-Roch (données ouvertes OpenStreetMap), pour placer les activités sur la carte.
// On reconnaît un lieu par un mot-clé dans son nom ; sinon on le cherche (Nominatim, limité à Saint-Roch, mis en cache).
export const KNOWN_PLACES: { name: string; keys: string[]; lat: number; lng: number }[] = [
  { name: "Parvis de l'église Saint-Roch", keys: ["eglise saint-roch", "parvis"], lat: 46.81503, lng: -71.22288 },
  { name: "Jardin Jean-Paul-L'Allier", keys: ["jean-paul-l'allier", "jean-paul-lallier"], lat: 46.81296, lng: -71.22301 },
  { name: "Bibliothèque Gabrielle-Roy", keys: ["gabrielle-roy"], lat: 46.81419, lng: -71.22583 },
  { name: "Place de l'Université-du-Québec", keys: ["universite-du-quebec", "place de l'universite"], lat: 46.81351, lng: -71.22355 },
  { name: "Parc des Pékans", keys: ["pekans"], lat: 46.81563, lng: -71.22453 },
  { name: "Parc Victoria", keys: ["parc victoria"], lat: 46.81726, lng: -71.23442 },
  { name: "Parc de la Pointe-aux-Lièvres", keys: ["pointe-aux-lievres"], lat: 46.82209, lng: -71.23569 },
  { name: "Marina Saint-Roch", keys: ["marina"], lat: 46.81852, lng: -71.22566 },
  { name: "Carré Lépine", keys: ["carre lepine"], lat: 46.81362, lng: -71.21958 },
  { name: "Parc de la Côte-Sauvageau", keys: ["cote sauvageau"], lat: 46.8076, lng: -71.23001 },
  { name: "Rue Notre-Dame-des-Anges", keys: ["notre-dame-des-anges"], lat: 46.81284, lng: -71.22761 },
  { name: "Îlot Fleurie", keys: ["ilot fleurie"], lat: 46.8122, lng: -71.2287 }, // position approximative (absent d'OpenStreetMap)
  { name: "Rue Saint-Vallier Est", keys: ["saint-vallier"], lat: 46.81149, lng: -71.22747 },
  { name: "Rue Saint-Joseph Est", keys: ["saint-joseph"], lat: 46.81433, lng: -71.22435 },
];

export type Coords = { lat: number; lng: number };

/** « Parvis de l'Église St-Roch » → « parvis de l'eglise saint-roch » */
export const foldPlace = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’`]/g, "'").replace(/\bst-/g, "saint-").replace(/\s+/g, " ").trim();

export function knownPlace(name: string): Coords | null {
  const f = foldPlace(name);
  const hit = KNOWN_PLACES.find((p) => p.keys.some((k) => f.includes(k)));
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

/** Lieu connu, sinon recherche en ligne (null si introuvable dans Saint-Roch ou service indisponible). */
export async function locatePlace(name: string, allowLookup: boolean): Promise<Coords | null> {
  const known = knownPlace(name);
  if (known || !allowLookup || name.trim().length < 3) return known;
  const found = await searchPlaces(name.trim());
  return found?.[0] ? { lat: found[0].lat, lng: found[0].lng } : null;
}
