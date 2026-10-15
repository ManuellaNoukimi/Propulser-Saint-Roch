// Formatage des dates (fr-CA) et filtres de date, utilisables côté client.
import type { DateFilterId } from "./constants";

export function formatDate(iso: string | null): string {
  if (!iso) return "Date à confirmer";
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit" }).format(d);
  return `${date} · ${time}`;
}

export function relativeDay(iso: string | null): string | null {
  if (!iso) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff > 1 && diff < 7) return `Dans ${diff} jours`;
  if (diff < 0) return "Passé";
  return null;
}

export function matchesDate(iso: string | null, filter: DateFilterId): boolean {
  if (filter === "toutes") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!iso) return filter === "a-venir"; // sans date (ex. recrutement) : visible dans « À venir »
  const t = new Date(iso).getTime();
  const day = 86_400_000;
  switch (filter) {
    case "a-venir":
      return t >= today.getTime();
    case "aujourdhui":
      return t >= today.getTime() && t < today.getTime() + day;
    case "semaine":
      return t >= today.getTime() && t < today.getTime() + 7 * day;
    case "mois":
      return t >= today.getTime() && t < today.getTime() + 31 * day;
  }
}

/** « 3 h », « 2 j », « 1 sem. » (court) ou « IL Y A 3 HEURES » (long), comme sous une publication. */
export function timeAgo(iso: string, long = false): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string, string][] = [
    [604_800, "sem.", "semaine"],
    [86_400, "j", "jour"],
    [3_600, "h", "heure"],
    [60, "min", "minute"],
  ];
  for (const [sec, short, word] of units) {
    if (s >= sec) {
      const n = Math.floor(s / sec);
      return long ? `il y a ${n} ${word}${n > 1 ? "s" : ""}` : `${n} ${short}`;
    }
  }
  return long ? "à l'instant" : "maintenant";
}

/** Bloc date d'un événement : { day: "17", month: "OCT.", weekday: "jeu." } */
export function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: new Intl.DateTimeFormat("fr-CA", { month: "short" }).format(d).toUpperCase(),
    weekday: new Intl.DateTimeFormat("fr-CA", { weekday: "long" }).format(d),
    time: new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit" }).format(d),
  };
}

export function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Convertit la valeur d'un <input type="datetime-local"> en ISO (UTC). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
