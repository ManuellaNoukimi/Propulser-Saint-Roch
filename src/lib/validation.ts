import { z } from "zod";
import { ACTOR_TYPES, BUSINESS_POST_TYPES, CATEGORIES, CONTRIBUTIONS, MAX_IMAGES, NEEDS, REPORT_CATEGORIES, REPORT_DESCRIPTION_MIN, REPORT_MOMENTS, REPORT_STATUSES, SECTORS, reportSubtypeOf } from "./constants";
import { PUBLICATION_KINDS } from "./quartier";

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [T[number]["id"], ...T[number]["id"][]];

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères maximum.`)
    .optional()
    .transform((v) => (v ? v : null));

// ---------- Comptes ----------
// Identifiant de connexion : un courriel OU n'importe quel identifiant (pas de validation de format, à la demande de Danny).
// Il reste unique (en minuscules) et n'apparaît jamais publiquement.
const loginId = z.string().trim().toLowerCase().min(1, "Indique ton courriel ou un identifiant.").max(120, "Courriel : 120 caractères maximum.");

// Démo de 5 minutes : AUCUNE contrainte de format (nom d'un caractère, mot de passe libre, secteur facultatif).
// On garde seulement : champs non vides, longueurs maximales (protègent la base) et le filtre anti-haine (dans les routes).
const profileFields = {
  displayName: z.string().trim().min(1, "Indique un nom.").max(60, "Nom : 60 caractères maximum."),
  accountType: z.enum(ids(ACTOR_TYPES)),
  sector: z.enum(ids(SECTORS)).nullable().optional().transform((v) => v ?? null),
  address: optionalText(120, "Adresse"),
  description: optionalText(300, "Description"),
};

// Démo SANS mot de passe ni courriel (demande de Danny) : le courriel/identifiant et le mot de passe sont facultatifs.
export const signupSchema = z.object({
  referralCode: z.string().trim().max(64).optional(),
  email: z.string().trim().toLowerCase().max(120).default(""),
  password: z.string().max(100).default(""),
  ...profileFields,
});

export const loginSchema = z.object({
  email: loginId.optional(), // un prénom, un pseudo ou un courriel
  password: z.string().max(100).default(""),
  guest: z.boolean().optional(), // « Entrer en invité·e » : compte invité créé avec juste un nom
  name: z.string().trim().max(60).default(""),
});

export const profileUpdateSchema = z.object(profileFields);

// ---------- Idées et complices (l'auteur vient de la session, jamais du corps de la requête) ----------
export const createIdeaSchema = z.object({
  title: z.string().trim().min(1, "Donne un titre à ta publication.").max(90, "Titre : 90 caractères maximum."),
  description: z.string().trim().max(1500, "Description : 1500 caractères maximum.").default(""), // facultative
  category: z.enum(ids(CATEGORIES)),
  place: z.string().trim().max(120, "Lieu : 120 caractères maximum.").default("").transform((v) => v || "Saint-Roch"),
  startsAt: z
    .string()
    .datetime({ offset: true, message: "Date invalide." })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  needs: z.array(z.enum(ids(NEEDS))).max(NEEDS.length).default([]),
  // F3 : promo / nouveauté / événement. Facultatif : les résident·e·s ne choisissent pas de type.
  kind: z.enum(ids(PUBLICATION_KINDS)).nullable().optional().transform((v) => v ?? null),
  images: z
    .array(z.string().regex(/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/, "Image invalide."))
    .max(MAX_IMAGES, `${MAX_IMAGES} images maximum.`)
    .default([]),
});

export const joinSchema = z.object({
  contribution: z.enum(ids(CONTRIBUTIONS)),
  message: z.string().trim().max(500, "Message : 500 caractères maximum.").default(""),
});


// Signalement : une catégorie (qui détermine besoin ou problème), une explication, une position dans Saint-Roch.
export const reportSchema = z
  .object({
    category: z.enum(ids(REPORT_CATEGORIES), { message: "Choisis une catégorie de signalement." }),
    subtype: z.string().trim().max(40).nullable().optional().transform((v) => v || null), // précision (facultative)
    description: z
      .string({ message: "Décris la situation." })
      .trim()
      .min(REPORT_DESCRIPTION_MIN, `Décris la situation en quelques mots (${REPORT_DESCRIPTION_MIN} caractères minimum).`)
      .max(500, "Description : 500 caractères maximum."),
    moment: z.enum(ids(REPORT_MOMENTS)).nullable().optional().transform((v) => v ?? null), // facultatif
    address: optionalText(160, "Adresse"), // libellé trouvé par la carte (ex. « 295, boulevard Charest Est »)
    lat: z.number().min(46.7).max(46.9),
    lng: z.number().min(-71.4).max(-71.1),
  })
  .refine((r) => !r.subtype || !!reportSubtypeOf(r.category, r.subtype), { message: "Précision inconnue pour cette catégorie.", path: ["subtype"] });

// Vue SDC : faire avancer un signalement (reçu → en traitement → réglé), avec un mot pour l'auteur
export const reportStatusSchema = z.object({
  status: z.enum(ids(REPORT_STATUSES), { message: "Statut inconnu." }),
  note: z.string().trim().max(300, "Message : 300 caractères maximum.").nullable().optional().transform((v) => v || null),
});
export type ReportInput = z.infer<typeof reportSchema>;

export type SignupInput = z.infer<typeof signupSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type JoinInput = z.infer<typeof joinSchema>;

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Données invalides.";
}

// ---------- Problème 1 : trouver et inviter ses complices ----------
export const matchSchema = z.object({ text: z.string().trim().min(1, "Décris ton idée en une phrase.").max(500, "Idée : 500 caractères maximum.") });
export const inviteSchema = z.object({
  ideaId: z.string().min(1),
  invites: z
    .array(z.object({ userId: z.string().min(1), contribution: z.enum(ids(CONTRIBUTIONS)), reason: z.string().trim().max(200).default("") }))
    .min(1, "Choisis au moins un complice à inviter.")
    .max(12),
});
export const answerSchema = z.object({ accept: z.boolean() });

// ---------- Onglet « Entreprises » ----------
export const businessPostSchema = z.object({
  postType: z.enum(ids(BUSINESS_POST_TYPES), { message: "Choisis le type de publication (promo, nouveauté, emploi, offre, annonce)." }),
  title: z.string().trim().min(1, "Donne un titre à ta publication.").max(90, "Titre : 90 caractères maximum."),
  description: z.string().trim().max(1500, "Texte : 1500 caractères maximum.").default(""),
  images: z
    .array(z.string().regex(/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/, "Image invalide."))
    .max(MAX_IMAGES, `${MAX_IMAGES} images maximum.`)
    .default([]),
});
