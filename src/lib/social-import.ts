// F3 — Import simulé des publications d'une page Facebook ou d'un compte Instagram.
//
// Pourquoi c'est simulé : lire la page d'un commerce qu'on ne gère pas demande
// « Page Public Content Access » chez Meta, donc App Review ET vérification
// d'entreprise (2 à 4 semaines). L'architecture ci-dessous est la vraie ; seule
// la source des données est un jeu d'essai. En production, remplacer
// `fetchPosts` par l'appel Graph API, le reste ne change pas :
//   Facebook  : GET /{page-id}/posts        (pages_show_list + pages_read_engagement)
//   Instagram : GET /{ig-user-id}/media     (compte pro rattaché à une page)

import { type PublicationKindId, type PublicationSource } from "./quartier";

/** Une publication telle qu'elle arrive de la source, avant d'entrer en base. */
export type SocialPost = {
  externalId: string; // id du post chez la source → l'import ne duplique jamais
  message: string;
  createdAt: string; // ISO
  startsAt?: string | null; // ISO, si la source annonce une date
};

/** Ce qu'on insère dans `ideas` après normalisation. */
export type ImportedPost = {
  externalId: string;
  title: string;
  description: string;
  kind: PublicationKindId;
  startsAt: string | null;
  createdAt: string;
};

const PROMO = /\b(rabais|promo|promotion|solde|soldes|spécial|special|\d+\s*%|2\s*pour\s*1|gratuit|aubaine)\b/i;
const NOUVEAUTE = /\b(nouveau|nouvelle|nouveauté|nouveautes|nouveautés|on lance|arriv(e|ée|ages?)|désormais|maintenant disponible)\b/i;

/**
 * Déduit le type de publication. Une date annoncée fait un événement ; sinon on
 * lit le texte. Par défaut « nouveaute » : c'est le type le moins engageant
 * (annoncer un rabais qui n'existe pas serait pire).
 */
export function inferKind(message: string, startsAt?: string | null): PublicationKindId {
  if (startsAt) return "evenement";
  if (PROMO.test(message)) return "promo";
  if (NOUVEAUTE.test(message)) return "nouveaute";
  return "nouveaute";
}

/** Première ligne (ou première phrase) du message, coupée à 90 caractères comme `createIdeaSchema`. */
export function titleFrom(message: string): string {
  const first = message.split(/\n|(?<=[.!?])\s/)[0].trim();
  const clean = first.replace(/\s+/g, " ");
  if (!clean) return "Publication";
  return clean.length <= 90 ? clean : `${clean.slice(0, 89).trimEnd()}…`;
}

/** Normalise un lot venant d'une source en lignes prêtes pour `ideas`. */
export function normalizePosts(posts: SocialPost[]): ImportedPost[] {
  return posts.map((p) => ({
    externalId: p.externalId,
    title: titleFrom(p.message),
    description: p.message.trim(),
    kind: inferKind(p.message, p.startsAt),
    startsAt: p.startsAt ?? null,
    createdAt: p.createdAt,
  }));
}

// ---------- Jeu d'essai (remplace l'appel Graph API pour la démo) ----------

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const inDays = (d: number, hour: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

const FIXTURES: Record<Exclude<PublicationSource, "manuel">, SocialPost[]> = {
  facebook: [
    { externalId: "fb_1001", message: "2 pour 1 sur les cafés filtre tout le mois d'octobre pour les voisins de Saint-Roch ☕", createdAt: hoursAgo(3) },
    { externalId: "fb_1002", message: "Nouveau au menu : notre soupe-repas du midi, préparée avec les légumes du Grand Marché.", createdAt: hoursAgo(26) },
    { externalId: "fb_1003", message: "Soirée micro ouvert au café !\nOn ouvre la scène aux voisins, apportez vos instruments.", createdAt: hoursAgo(50), startsAt: inDays(3, 19) },
  ],
  instagram: [
    { externalId: "ig_2001", message: "Nouvelle terrasse arrière ouverte ✨ Un coin tranquille à deux pas de la rue Saint-Joseph.", createdAt: hoursAgo(8) },
    { externalId: "ig_2002", message: "Rabais de 15 % sur les viennoiseries après 16 h — on préfère les donner que les jeter.", createdAt: hoursAgo(31) },
  ],
};

/**
 * Remplace l'appel Graph API. En production : requête HTTP vers la source avec
 * le Page access token du commerçant, puis même passage par `normalizePosts`.
 */
export function fetchPosts(source: Exclude<PublicationSource, "manuel">): SocialPost[] {
  return FIXTURES[source] ?? [];
}

export const SIMULATED_NOTICE = "Démo : import simulé. La liaison réelle demande l'approbation de Meta (App Review et vérification d'entreprise).";
