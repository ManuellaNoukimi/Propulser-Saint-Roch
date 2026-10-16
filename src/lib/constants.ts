// Listes de référence partagées entre le client et le serveur.
// ⚠️ Aucune donnée confidentielle ici : uniquement des catégories et des lieux publics connus de Saint-Roch.

export const CATEGORIES = [
  { id: "culturel", label: "Culturel", emoji: "🎭" },
  { id: "communautaire", label: "Communautaire", emoji: "🤝" },
  { id: "benevolat", label: "Bénévolat", emoji: "💛" },
  { id: "recrutement", label: "Recrutement", emoji: "📣" },
  { id: "sport", label: "Sport et loisirs", emoji: "⚽" },
  { id: "commerce", label: "Commerce local", emoji: "🛍️" },
  { id: "environnement", label: "Environnement", emoji: "🌱" },
] as const;

// Types de comptes. « personnel » = une personne ; « etablissement » = commerce, lieu de travail ou organisme.
export const ACTOR_TYPES = [
  { id: "habitant", label: "Habitant·e", emoji: "🏠", group: "personnel", hint: "Tu vis à Saint-Roch ou tout près" },
  { id: "travailleur", label: "Travailleur·euse", emoji: "💼", group: "personnel", hint: "Tu travailles dans le quartier" },
  { id: "etudiant", label: "Étudiant·e", emoji: "🎓", group: "personnel", hint: "Tu étudies dans le quartier ou à Québec" },
  { id: "commerce", label: "Commerce / restaurant", emoji: "🍽️", group: "etablissement", hint: "Boutique, restaurant, café, bar…" },
  { id: "entreprise", label: "Entreprise / lieu de travail", emoji: "🏢", group: "etablissement", hint: "Bureau, studio, coop, institution…" },
  { id: "organisme", label: "Organisme", emoji: "🏛️", group: "etablissement", hint: "Communautaire, culturel, sportif…" },
] as const;

export const ACCOUNT_GROUPS = [
  { id: "personnel", label: "Résident·e", emoji: "🏠", description: "Tu publies une activité (bénévolat, aide, vide-grenier…). Ton profil est privé ; tu peux choisir de partager ton niveau et tes badges. Ta publication disparaît après l'événement." },
  { id: "etablissement", label: "Entreprise", emoji: "🏪", description: "Commerce, restaurant, entreprise ou organisme : tu as une page publique avec toutes tes publications." },
] as const;

// Secteur d'activité d'un établissement
export const SECTORS = [
  { id: "restaurant", label: "Restaurant", emoji: "🍽️", for: ["commerce"] },
  { id: "cafe", label: "Café / boulangerie", emoji: "☕", for: ["commerce"] },
  { id: "bar", label: "Bar / microbrasserie", emoji: "🍺", for: ["commerce"] },
  { id: "boutique", label: "Boutique / friperie", emoji: "🛍️", for: ["commerce"] },
  { id: "alimentation", label: "Épicerie / alimentation", emoji: "🥖", for: ["commerce"] },
  { id: "services", label: "Services (coiffure, santé, réparation…)", emoji: "✂️", for: ["commerce", "entreprise"] },
  { id: "culture", label: "Salle de spectacle / culture", emoji: "🎭", for: ["commerce", "organisme"] },
  { id: "hebergement", label: "Hébergement", emoji: "🛏️", for: ["commerce"] },
  { id: "bureau", label: "Bureau / services professionnels", emoji: "🗂️", for: ["entreprise"] },
  { id: "tech", label: "Tech / jeux vidéo / créatif", emoji: "🎮", for: ["entreprise"] },
  { id: "economie-sociale", label: "Coopérative / économie sociale", emoji: "🤝", for: ["entreprise", "organisme"] },
  { id: "institution", label: "Institution / gouvernement / école", emoji: "🏛️", for: ["entreprise", "organisme"] },
  { id: "communautaire", label: "Communautaire / social", emoji: "💛", for: ["organisme"] },
  { id: "sport-loisir", label: "Sport / loisir", emoji: "⚽", for: ["organisme"] },
  { id: "autre", label: "Autre", emoji: "✨", for: ["commerce", "entreprise", "organisme"] },
] as const;

export const NEEDS = [
  { id: "participants", label: "Des participants", emoji: "🙌" },
  { id: "benevoles", label: "Des bénévoles", emoji: "💪" },
  { id: "materiel", label: "Du matériel", emoji: "🧰" },
  { id: "lieu", label: "Un lieu", emoji: "📍" },
  { id: "commandite", label: "Une commandite", emoji: "💸" },
  { id: "expertise", label: "Une expertise", emoji: "🧠" },
] as const;

// Façon dont un complice se propose d'aider
export const CONTRIBUTIONS = [
  { id: "participer", label: "Je participe", emoji: "🙌", need: "participants" },
  { id: "benevole", label: "Je suis bénévole", emoji: "💪", need: "benevoles" },
  { id: "materiel", label: "Je prête du matériel", emoji: "🧰", need: "materiel" },
  { id: "lieu", label: "J'offre un lieu", emoji: "📍", need: "lieu" },
  { id: "commandite", label: "Je commandite", emoji: "💸", need: "commandite" },
  { id: "expertise", label: "J'apporte une expertise", emoji: "🧠", need: "expertise" },
] as const;

// Lieux publics bien connus de Saint-Roch (information publique, pas tirée des fichiers confidentiels)
export const PLACES = [
  "Parvis de l'église Saint-Roch",
  "Jardin Jean-Paul-L'Allier",
  "Bibliothèque Gabrielle-Roy",
  "Place de l'Université-du-Québec",
  "Rue Saint-Joseph Est",
  "Parc des Pékans",
  "Parc Victoria",
  "Parc de la Pointe-aux-Lièvres",
  "Marina Saint-Roch",
  "Îlot Fleurie",
] as const;

// Signalements sur la carte : un BESOIN (ce qui manque) ou un PROBLÈME (ce qui ne va pas).
// On signale des lieux et des besoins, jamais des personnes.
export const REPORT_KINDS = [
  { id: "besoin", label: "Un besoin", emoji: "🙋", hint: "Ce qui manque ici" },
  { id: "probleme", label: "Un problème", emoji: "⚠️", hint: "Ce qui ne va pas ici" },
] as const;

export const REPORT_CATEGORIES = [
  // Besoins
  { id: "epicerie", kind: "besoin", label: "Épicerie / alimentation", emoji: "🛒", color: "#22a06b" },
  { id: "commerce", kind: "besoin", label: "Commerce de proximité", emoji: "🏪", color: "#22a06b" },
  { id: "bancs", kind: "besoin", label: "Bancs / mobilier", emoji: "🪑", color: "#22a06b" },
  { id: "toilettes", kind: "besoin", label: "Toilettes publiques", emoji: "🚻", color: "#22a06b" },
  { id: "eau", kind: "besoin", label: "Point d'eau", emoji: "🚰", color: "#22a06b" },
  { id: "verdure", kind: "besoin", label: "Verdure / arbres", emoji: "🌳", color: "#22a06b" },
  { id: "jeux", kind: "besoin", label: "Jeux pour enfants", emoji: "🛝", color: "#22a06b" },
  { id: "velo", kind: "besoin", label: "Stationnement vélo / auto", emoji: "🚲", color: "#22a06b" },
  { id: "accessibilite", kind: "besoin", label: "Accessibilité", emoji: "♿", color: "#22a06b" },
  { id: "activites", kind: "besoin", label: "Activités / culture", emoji: "🎭", color: "#22a06b" },
  { id: "autre-besoin", kind: "besoin", label: "Autre besoin", emoji: "✨", color: "#22a06b" },
  // Problèmes
  { id: "lumiere", kind: "probleme", label: "Manque de lumière", emoji: "💡", color: "#ff3040" },
  { id: "salete", kind: "probleme", label: "Saleté / déchets", emoji: "🗑️", color: "#ff3040" },
  { id: "vol", kind: "probleme", label: "Vol / vandalisme", emoji: "🔓", color: "#ff3040" },
  { id: "insecurite", kind: "probleme", label: "Sentiment d'insécurité", emoji: "😟", color: "#ff3040" },
  { id: "chaussee", kind: "probleme", label: "Trottoir / chaussée abîmé", emoji: "🕳️", color: "#ff3040" },
  { id: "chantier", kind: "probleme", label: "Chantier / accès bloqué", emoji: "🚧", color: "#ff3040" },
  { id: "bruit", kind: "probleme", label: "Bruit", emoji: "🔊", color: "#ff3040" },
  { id: "graffiti", kind: "probleme", label: "Graffiti", emoji: "🖍️", color: "#ff3040" },
  { id: "autre-probleme", kind: "probleme", label: "Autre problème", emoji: "❓", color: "#ff3040" },
] as const;

// « Quand est-ce que ça arrive ? » (facultatif) : utile pour la Ville (ex. manque de lumière le soir).
export const REPORT_MOMENTS = [
  { id: "jour", label: "Le jour", emoji: "☀️" },
  { id: "soir", label: "Le soir", emoji: "🌆" },
  { id: "nuit", label: "La nuit", emoji: "🌙" },
  { id: "toujours", label: "Tout le temps", emoji: "🔁" },
] as const;
export type ReportMomentId = (typeof REPORT_MOMENTS)[number]["id"];
export const reportMomentOf = (id: string | null | undefined) => REPORT_MOMENTS.find((m) => m.id === id);
export const MAX_REPORT_PHOTOS = 3;

export type ReportKindId = (typeof REPORT_KINDS)[number]["id"];
export type ReportCategoryId = (typeof REPORT_CATEGORIES)[number]["id"];
export const reportCategoryOf = (id: string) => REPORT_CATEGORIES.find((c) => c.id === id);

export const DATE_FILTERS = [
  { id: "a-venir", label: "À venir" },
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "semaine", label: "Cette semaine" },
  { id: "mois", label: "Ce mois-ci" },
  { id: "toutes", label: "Toutes" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type ActorTypeId = (typeof ACTOR_TYPES)[number]["id"];
export type SectorId = (typeof SECTORS)[number]["id"];
export const isEstablishment = (t: string) => ACTOR_TYPES.find((a) => a.id === t)?.group === "etablissement";
export const sectorOf = (id: string | null | undefined) => SECTORS.find((s) => s.id === id);
export type NeedId = (typeof NEEDS)[number]["id"];
export type ContributionId = (typeof CONTRIBUTIONS)[number]["id"];
export type DateFilterId = (typeof DATE_FILTERS)[number]["id"];

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);
export const actorTypeOf = (id: string) => ACTOR_TYPES.find((a) => a.id === id);
export const needOf = (id: string) => NEEDS.find((n) => n.id === id);
export const contributionOf = (id: string) => CONTRIBUTIONS.find((c) => c.id === id);

export const MAX_IMAGES = 4;
