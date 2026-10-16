import type { ActorTypeId, CategoryId, ContributionId, NeedId, SectorId } from "./constants";
import type { PublicationSource } from "./quartier";

export type Badge = {
  id: "super-voisin" | "bonne-personne" | "batisseur" | "rassembleur" | "premier-complice";
  label: string;
  emoji: string;
  description: string;
};

/** Profil public d'un compte (jamais le courriel ni le mot de passe). */
export type PublicUser = {
  id: string;
  displayName: string;
  accountType: ActorTypeId;
  sector: SectorId | null;
  address: string | null;
  description: string | null;
};

/** Compte connecté (vu par son propriétaire uniquement). */
export type SessionUser = PublicUser & {
  email: string;
  createdAt: string;
};

export type Complice = {
  id: string;
  ideaId: string;
  user: PublicUser;
  contribution: ContributionId;
  message: string;
  createdAt: string;
  badges: Badge[];
};

export type Idea = {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  organizer: PublicUser;
  place: string;
  startsAt: string | null; // ISO
  needs: NeedId[];
  images: string[]; // URLs /api/uploads/…
  createdAt: string;
  source: PublicationSource; // F3 : « manuel » par défaut, sinon page liée (le type promo / nouveauté est dans postType)
  complicesCount: number;
  myContributions?: string[]; // comment la personne connectée participe (vide = pas inscrite)
  kind?: "activite" | "entreprise"; // espace : Vie Saint-Roch ou Entreprises
  postType?: string | null; // type de publication d'entreprise (promo, emploi…)
};

export type IdeaWithComplices = Idea & {
  organizerBadges: Badge[];
  complices: Complice[];
  isMine: boolean;
  invitations: Invitation[]; // seulement pour l'organisateur·rice
  myInvitation: Invitation | null; // si la personne connectée a été invitée
};

/** Problème 1 : invitation « Tu es invité·e à… » [Je suis complice] [Pas cette fois]. */
export type Invitation = {
  id: string;
  idea: { id: string; title: string; place: string; startsAt: string | null; images: string[]; category: string };
  from: PublicUser;
  to: PublicUser;
  contribution: string;
  reason: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

/** Problème 1 : ce que le moteur « Trouver mes complices » propose. */
export type MatchResult = {
  activity: { id: string; label: string; emoji: string };
  title: string;
  category: string;
  helpers: { user: PublicUser; contribution: string; why: string[] }[];
  place: { name: string; why: string };
  needs: string[];
  logistics: { label: string; detail: string; link?: string }[];
  when: { iso: string; why: string };
  plan: { id: string; label: string }[];
};

export type PublicProfile = {
  user: PublicUser;
  stats: ProfileStats;
  badges: Badge[];
  allBadges: Badge[];
  ideas: Idea[];
  joined: Idea[];
  isMe: boolean;
};

/** Signalement privé (visible seulement par son auteur). */
export type Report = {
  id: string;
  ref: string; // numéro lisible, ex. « SR-4F2A9C » (comme un numéro de requête 311)
  kind: "besoin" | "probleme";
  category: string;
  description: string;
  moment: string | null; // jour, soir, nuit, toujours
  address: string | null; // ex. « 295, boulevard Charest Est »
  photos: string[]; // /api/report-photos/… (servies seulement à l'auteur)
  lat: number;
  lng: number;
  createdAt: string;
};

export type ProfileStats = { joined: number; helped: number; launched: number; maxComplicesOnIdea: number; firstJoins: number };
