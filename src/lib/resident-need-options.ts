export const RESIDENT_NEED_CATEGORIES = [
  { id: "epicerie", label: "Épicerie", emoji: "🛒" },
  { id: "boulangerie", label: "Boulangerie", emoji: "🥖" },
  { id: "fruiterie", label: "Fruits et légumes", emoji: "🍎" },
  { id: "boucherie", label: "Boucherie", emoji: "🥩" },
  { id: "cafe", label: "Café", emoji: "☕" },
  { id: "pharmacie", label: "Pharmacie", emoji: "💊" },
  { id: "clinique", label: "Clinique", emoji: "🩺" },
  { id: "gym", label: "Gym et sport", emoji: "🏋️" },
  { id: "librairie", label: "Librairie", emoji: "📚" },
  { id: "quincaillerie", label: "Quincaillerie", emoji: "🔧" },
  { id: "garderie", label: "Garderie", emoji: "🧸" },
  { id: "communautaire", label: "Espace communautaire", emoji: "🤝" },
  { id: "autre", label: "Autre service", emoji: "✨" },
] as const;
export type ResidentNeedCategory = typeof RESIDENT_NEED_CATEGORIES[number]["id"];
export type ResidentZone = { lat: number; lng: number; radiusMeters: number };
/** Une zone publique approximative : le centre est arrondi à environ un pâté de maisons. */
export function approximateResidentPoint(lat: number, lng: number) {
  return { lat: Number(lat.toFixed(3)), lng: Number(lng.toFixed(3)) };
}
export function residentZoneDistance(a: Pick<ResidentZone, "lat" | "lng">, b: Pick<ResidentZone, "lat" | "lng">) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function residentZonesOverlap(a: ResidentZone, b: ResidentZone) {
  return residentZoneDistance(a, b) <= a.radiusMeters + b.radiusMeters;
}
export const residentZoneLabel = (zone: ResidentZone) => `Zone personnalisée · rayon ${zone.radiusMeters} m`;
export type ResidentNeed = {
  id: string; category: ResidentNeedCategory; label: string; zone: ResidentZone;
  supporters: number; visitsPerWeek: number; createdAt: string;
  mySupport: { frequency: number } | null;
};
