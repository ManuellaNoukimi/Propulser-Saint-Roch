// « Y aller » : libellés, couleurs et formats partagés par l'écran et la carte.
import type { Mode, Parking } from "./y-aller-types";

export const MODES: { id: Mode; label: string; emoji: string; color: string }[] = [
  { id: "auto", label: "Auto", emoji: "🚗", color: "#7552de" },
  { id: "bus", label: "Bus", emoji: "🚌", color: "#f08c00" },
  { id: "velo", label: "Vélo", emoji: "🚲", color: "#22a06b" },
  { id: "marche", label: "À pied", emoji: "🚶", color: "#1a73e8" },
];
export const modeOf = (id: Mode) => MODES.find((m) => m.id === id)!;

export const PARKING_COLOR: Record<Parking["kind"], string> = { ville: "#7552de", public: "#1a73e8", clients: "#64748b", inconnu: "#9ca3af" };
export const PARKING_KIND: Record<Parking["kind"], string> = { ville: "Municipal", public: "Public", clients: "Clientèle", inconnu: "Accès à vérifier" };
export const PARKING_TYPE: Record<Parking["type"], string> = { interieur: "Intérieur", etage: "Étagé", souterrain: "Souterrain", surface: "Extérieur", rue: "Dans la rue" };

/** 754 s → « 13 min » ; 4 000 s → « 1 h 07 » */
export function duration(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
/** 850 m → « 850 m » ; 8 122 m → « 8,1 km » */
export function meters(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} km`;
}
/** Heure « 16 h 05 » */
export function clock(ms: number | string): string {
  return new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }).format(new Date(ms));
}
/** « 4.80$ per hour » (OpenStreetMap) → « 4,80 $/h » */
export function charge(c: string | null): string | null {
  if (!c) return null;
  return c.replace(/(\d+)\.(\d+)/g, "$1,$2").replace(/\$\s*per\s*hour/i, " $/h").replace(/per hour/i, "/h");
}
export function places(p: Pick<Parking, "capacity" | "estimated">): string | null {
  if (!p.capacity) return null;
  return `${p.estimated ? "≈ " : ""}${p.capacity.toLocaleString("fr-CA")} place${p.capacity > 1 ? "s" : ""}`;
}
