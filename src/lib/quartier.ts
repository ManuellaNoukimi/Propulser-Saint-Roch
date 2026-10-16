// Listes de référence des problèmes 1 à 4 (partagées client et serveur).
// ⚠️ Aucune donnée confidentielle : lieux publics, actions du Plan d'action PUBLIC de la Ville, liens officiels publics.

// ---------- Problème 1 : actions du Plan d'action Saint-Roch 2026-2029 (document public) ----------
export const PLAN_ACTIONS: Record<string, string> = {
  "1.2": "Améliorer l'accès aux services de base",
  "1.4": "Soutenir l'intégration des populations immigrantes",
  "1.10": "Optimiser l'éclairage public dans les zones sensibles",
  "1.11": "Rendre le parvis de l'église Saint-Roch plus convivial",
  "1.12": "Accompagner le verdissement",
  "1.15": "Interventions rapides dans l'espace public (jeux participatifs, verdissement)",
  "2.1": "Programmation de proximité et familiale",
  "2.2": "Soutenir les événements festifs",
  "2.5": "Faire de la bibliothèque Gabrielle-Roy une destination",
  "2.6": "Faire connaître la richesse culturelle, gastronomique et patrimoniale",
  "2.7": "Rabais croisés entre culture et commerces",
  "2.8": "Nouveaux ateliers d'artistes et espaces de création",
  "3.2": "Rabais partenaires entre commerces et travailleurs",
  "3.5": "Diagnostic des espaces vacants",
  "3.10": "Boutique éphémère sur rue",
};

// Liens officiels de la Ville de Québec (publics)
export const CITY_LINKS = {
  evenement: "https://www.ville.quebec.qc.ca/gens_affaires/evenement/evenement_local.aspx",
  feteVoisins: "https://www.ville.quebec.qc.ca/citoyens/art-culture/activites/fete-voisins.aspx",
  materiel: "https://www.ville.quebec.qc.ca/citoyens/loisirs_sports/reservation.aspx",
} as const;

// ---------- Problème 2 : étiquettes des activités ----------
export const IDEA_TAGS = [
  { id: "gratuit", label: "Gratuit", emoji: "🆓" },
  { id: "famille", label: "En famille", emoji: "👨‍👩‍👧" },
  { id: "midi", label: "Le midi", emoji: "🍽️" },
  { id: "soir", label: "Le soir", emoji: "🌙" },
  { id: "seul", label: "Viens seul·e, on t'accueille", emoji: "🤗" },
] as const;
export type IdeaTagId = (typeof IDEA_TAGS)[number]["id"];

// ---------- Problème 3 : Le Midi Complice ----------
export const WEEKDAYS = [
  { id: 1, short: "Lun", label: "lundi" },
  { id: 2, short: "Mar", label: "mardi" },
  { id: 3, short: "Mer", label: "mercredi" },
  { id: 4, short: "Jeu", label: "jeudi" },
  { id: 5, short: "Ven", label: "vendredi" },
] as const;
export const MIDI_KINDS = [
  { id: "table", label: "Table complice", emoji: "🍽️", action: "Je m'assois" },
  { id: "pause", label: "Pause active", emoji: "🎯", action: "J'y vais" },
] as const;
export type MidiKindId = (typeof MIDI_KINDS)[number]["id"];

export const OFFER_KINDS = [
  { id: "midi", label: "Offre du midi (travailleurs)", emoji: "💳" },
  { id: "promo", label: "Promo", emoji: "🏷️" },
  { id: "nouveau", label: "Nouveauté", emoji: "✨" },
] as const;
export type OfferKindId = (typeof OFFER_KINDS)[number]["id"];

// F3 : ce qu'un commerce ou un organisme publie. « evenement » est le seul type daté.
export const PUBLICATION_KINDS = [
  { id: "promo", label: "Promo", emoji: "🏷️", hint: "Un rabais ou une offre limitée dans le temps." },
  { id: "nouveaute", label: "Nouveauté", emoji: "✨", hint: "Un nouveau produit, service ou aménagement." },
  { id: "evenement", label: "Événement", emoji: "📅", hint: "Une activité à une date précise." },
] as const;
export type PublicationKindId = (typeof PUBLICATION_KINDS)[number]["id"];
export const publicationKindOf = (id: string | null) => PUBLICATION_KINDS.find((k) => k.id === id);

// F3 : d'où vient la publication. « manuel » = écrite dans l'app ; les autres arrivent d'une page liée.
export const PUBLICATION_SOURCES = [
  { id: "manuel", label: "Publié dans Complices" },
  { id: "facebook", label: "via Facebook" },
  { id: "instagram", label: "via Instagram" },
] as const;
export type PublicationSource = (typeof PUBLICATION_SOURCES)[number]["id"];
export const publicationSourceOf = (id: string) => PUBLICATION_SOURCES.find((s) => s.id === id);

// ---------- Problème 4 : Vitrines à remplir ----------
export const WISHES = [
  { id: "epicerie", label: "Épicerie", emoji: "🛒" },
  { id: "boucherie", label: "Boucherie", emoji: "🥩" },
  { id: "boulangerie", label: "Boulangerie", emoji: "🥖" },
  { id: "fruiterie", label: "Fruits et légumes", emoji: "🍎" },
  { id: "cafe", label: "Café", emoji: "☕" },
  { id: "resto", label: "Restaurant", emoji: "🍽️" },
  { id: "pharmacie", label: "Pharmacie", emoji: "💊" },
  { id: "librairie", label: "Librairie", emoji: "📚" },
  { id: "quincaillerie", label: "Quincaillerie", emoji: "🔧" },
  { id: "autre", label: "Autre", emoji: "✨" },
] as const;
export type WishId = (typeof WISHES)[number]["id"];

export const FREQUENCIES = [
  { id: 1, label: "1 fois par semaine" },
  { id: 2, label: "2 fois par semaine" },
  { id: 3, label: "3 fois et plus" },
  { id: 0, label: "De temps en temps" },
] as const;

export const BOOKING_PROJECTS = [
  { id: "expo", label: "Expo d'artiste", emoji: "🖼️" },
  { id: "boutique", label: "Boutique éphémère", emoji: "🛍️" },
  { id: "atelier", label: "Atelier", emoji: "🧶" },
  { id: "etudiant", label: "Projet étudiant", emoji: "🎓" },
  { id: "autre", label: "Autre projet", emoji: "✨" },
] as const;
export type BookingProjectId = (typeof BOOKING_PROJECTS)[number]["id"];

export const wishOf = (id: string) => WISHES.find((w) => w.id === id);
export const bookingProjectOf = (id: string) => BOOKING_PROJECTS.find((p) => p.id === id);
export const weekdayOf = (id: number) => WEEKDAYS.find((d) => d.id === id);
export const offerKindOf = (id: string) => OFFER_KINDS.find((k) => k.id === id);

/** Date locale « AAAA-MM-JJ » (pas UTC : un midi au Québec reste le même jour). */
export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Jour de semaine (1 = lundi … 7 = dimanche) d'une date « AAAA-MM-JJ ». */
export function weekdayOfDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return w === 0 ? 7 : w;
}

/** Prochain jour ouvrable (aujourd'hui si on est en semaine). */
export function nextWorkday(from = new Date()): string {
  const d = new Date(from);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return localDay(d);
}
