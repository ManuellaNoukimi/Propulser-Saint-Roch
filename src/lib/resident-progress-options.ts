// The resident registration option maps to habitant in the existing user model.
export const isResidentAccount = (accountType: string) =>
  accountType === "habitant";

export const RESIDENT_POINT_RULES = {
  checkin: { points: 10, label: "Check-in à une activité (simulé)" },
  help: { points: 20, label: "Coup de main confirmé" },
  idea: { points: 30, label: "Idée avec deux complices" },
  join: { points: 15, label: "Participation comme complice" },
  vote: { points: 5, label: "Soutien à un besoin ou vote sur une vitrine" },
  midi: { points: 10, label: "Midi Complice (simulé)" },
  booking: { points: 40, label: "Occupation de vitrine confirmée" },
  referral: { points: 10, label: "Inscription avec ton code d’invitation" },
} as const;
export type ResidentPointAction = keyof typeof RESIDENT_POINT_RULES;
export const RESIDENT_LEVELS = [
  { id: "voisin", label: "Voisin", minimum: 0 },
  { id: "complice", label: "Complice", minimum: 50 },
  { id: "quartier", label: "Complice de quartier", minimum: 150 },
  { id: "pilier", label: "Pilier de Saint-Roch", minimum: 400 },
] as const;
export const RESIDENT_BADGES = [
  {
    id: "super-voisin",
    label: "Super voisin",
    emoji: "🏡",
    description: "Rejoindre trois initiatives.",
  },
  {
    id: "bonne-personne",
    label: "Bonne personne",
    emoji: "💛",
    description: "Proposer une aide concrète.",
  },
  {
    id: "batisseur",
    label: "Bâtisseur",
    emoji: "💡",
    description: "Lancer une idée.",
  },
  {
    id: "rassembleur",
    label: "Rassembleur",
    emoji: "🔥",
    description: "Réunir cinq complices autour d’une idée.",
  },
  {
    id: "premier-complice",
    label: "Premier complice",
    emoji: "⭐",
    description: "Être le premier à rejoindre une idée.",
  },
  {
    id: "batisseur-idees",
    label: "Bâtisseur d’idées",
    emoji: "🌱",
    description: "Une idée a réuni au moins deux complices distincts.",
  },
  {
    id: "ami-vitrines",
    label: "Ami des vitrines",
    emoji: "🏪",
    description: "Contribuer à trois besoins ou vitrines distincts.",
  },
  {
    id: "coup-main",
    label: "Coup de main",
    emoji: "🤝",
    description: "Recevoir la confirmation d’une aide par l’organisateur.",
  },
] as const;
export const RESIDENT_DAILY_POINTS_LIMIT = 100;
export function residentLevel(score: number) {
  const level = [...RESIDENT_LEVELS]
    .reverse()
    .find((item) => score >= item.minimum)!;
  const next = RESIDENT_LEVELS.find((item) => item.minimum > score) ?? null;
  return { level, next, remaining: next ? next.minimum - score : 0 };
}
export function progressDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
