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
  kind?: ImportedKind; // type connu à la source (ex. une offre d'emploi LinkedIn)
};

/** Type d'une publication importée : promo, nouveauté, événement, ou une offre d'emploi / annonce (LinkedIn). */
export type ImportedKind = PublicationKindId | "emploi" | "annonce";

/** Ce qu'on insère dans `ideas` après normalisation. */
export type ImportedPost = {
  externalId: string;
  title: string;
  description: string;
  kind: ImportedKind;
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
    kind: p.kind ?? inferKind(p.message, p.startsAt),
    startsAt: p.startsAt ?? null,
    createdAt: p.createdAt,
  }));
}

// ---------- Jeu d'essai (remplace les appels aux réseaux pour la démo) ----------
// Publications FICTIVES, adaptées au type d'entreprise qui lie sa page (café ou resto, boutique, bureau ou studio, organisme),
// pour Facebook, Instagram et LinkedIn. Les identifiants sont propres à chaque compte : chaque entreprise reçoit les siennes.

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const inDays = (d: number, hour: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

type Network = Exclude<PublicationSource, "manuel">;
type Profile = "resto" | "boutique" | "bureau" | "organisme";
type Fixture = { id: string; message: string; ago: number; startsAt?: () => string; kind?: ImportedKind };

const FIXTURES: Record<Profile, Record<Network, Fixture[]>> = {
  resto: {
    facebook: [
      { id: "1", message: "2 pour 1 sur les cafés filtre tout le mois d'octobre pour les voisins de Saint-Roch !", ago: 3 },
      { id: "2", message: "Nouveau au menu : notre soupe-repas du midi, préparée avec les légumes du marché.", ago: 26 },
      { id: "3", message: "Soirée micro ouvert !\nOn ouvre la scène aux voisins, apportez vos instruments.", ago: 50, startsAt: () => inDays(3, 19) },
    ],
    instagram: [
      { id: "1", message: "Nouvelle terrasse arrière ouverte : un coin tranquille à deux pas de la rue Saint-Joseph.", ago: 8 },
      { id: "2", message: "Rabais de 15 % sur les viennoiseries après 16 h : on préfère les donner que les jeter.", ago: 31 },
    ],
    linkedin: [
      { id: "1", message: "On recrute : cuisinier·ère à temps plein, horaire de jour, équipe de 6 personnes. Écris-nous !", ago: 20, kind: "emploi" },
      { id: "2", message: "Fiers de servir désormais des produits de 5 fermes de la région, à moins de 100 km du quartier.", ago: 72 },
    ],
  },
  boutique: {
    facebook: [
      { id: "1", message: "Arrivage de manteaux d'hiver : plus de 80 pièces en boutique dès aujourd'hui.", ago: 5 },
      { id: "2", message: "Vente-trottoir samedi !\nTout à 50 % devant la boutique, rue Saint-Joseph.", ago: 40, startsAt: () => inDays(2, 10) },
    ],
    instagram: [
      { id: "1", message: "Nouvelle collection de tuques tricotées par une artisane du quartier.", ago: 12 },
      { id: "2", message: "Promo : 20 % sur les bottes cette semaine pour les étudiant·e·s.", ago: 34 },
    ],
    linkedin: [
      { id: "1", message: "Poste de conseiller·ère en boutique, 25 h par semaine, idéal pour une personne aux études.", ago: 18, kind: "emploi" },
      { id: "2", message: "Notre boutique a revendu 3 000 vêtements de seconde main cette année : merci au quartier !", ago: 96, kind: "annonce" },
    ],
  },
  bureau: {
    facebook: [
      { id: "1", message: "Portes ouvertes au studio !\nViens voir nos projets et rencontrer l'équipe.", ago: 9, startsAt: () => inDays(4, 16) },
      { id: "2", message: "Nouveau : notre salle de réunion est prêtée gratuitement aux organismes du quartier le vendredi.", ago: 30 },
    ],
    instagram: [
      { id: "1", message: "Nouvelle murale dans nos bureaux, réalisée avec des artistes de Saint-Roch.", ago: 14 },
      { id: "2", message: "Rencontre avec les étudiant·e·s du quartier universitaire : merci pour vos questions !", ago: 60, kind: "annonce" },
    ],
    linkedin: [
      { id: "1", message: "Nous recrutons un·e développeur·se web junior, en présentiel à Saint-Roch. Formation offerte.", ago: 6, kind: "emploi" },
      { id: "2", message: "Stage d'été rémunéré en design de jeux : candidatures ouvertes jusqu'au 15 novembre.", ago: 48, kind: "emploi" },
      { id: "3", message: "Nouveau partenariat avec deux organismes du quartier pour des ateliers numériques gratuits.", ago: 100 },
    ],
  },
  organisme: {
    facebook: [
      { id: "1", message: "Collecte de manteaux et de bottes : on accepte vos dons cette semaine.", ago: 4, startsAt: () => inDays(1, 13) },
      { id: "2", message: "Nouveau : la cuisine collective a lieu maintenant tous les mercredis.", ago: 28 },
    ],
    instagram: [
      { id: "1", message: "Merci aux 40 bénévoles de la soupe de samedi, quelle belle équipe !", ago: 16, kind: "annonce" },
      { id: "2", message: "Repas communautaire gratuit jeudi midi !\nTout le monde est le bienvenu.", ago: 36, startsAt: () => inDays(5, 12) },
    ],
    linkedin: [
      { id: "1", message: "Offre d'emploi : coordonnateur·trice des bénévoles, 4 jours par semaine.", ago: 22, kind: "emploi" },
      { id: "2", message: "Nous cherchons des entreprises du quartier pour parrainer nos paniers d'hiver.", ago: 80, kind: "annonce" },
    ],
  },
};

const RESTO = ["restaurant", "cafe", "bar", "alimentation", "hebergement"];
const BOUTIQUE = ["boutique", "services"];

function profileOf(account: { accountType: string; sector: string | null }): Profile {
  if (account.accountType === "organisme") return "organisme";
  if (account.sector && RESTO.includes(account.sector)) return "resto";
  if (account.sector && BOUTIQUE.includes(account.sector)) return "boutique";
  if (account.accountType === "commerce") return "boutique";
  return "bureau";
}

/**
 * Remplace l'appel au réseau. En production : requête HTTP vers la source avec le jeton d'accès
 * du commerçant, puis même passage par `normalizePosts`.
 */
export function fetchPosts(source: Network, account: { id: string; accountType: string; sector: string | null }): SocialPost[] {
  return (FIXTURES[profileOf(account)][source] ?? []).map((f) => ({
    externalId: `${source}_${account.id}_${f.id}`, // propre au compte : chaque entreprise reçoit ses publications
    message: f.message,
    createdAt: hoursAgo(f.ago),
    startsAt: f.startsAt ? f.startsAt() : null,
    kind: f.kind,
  }));
}
