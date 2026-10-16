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
  { id: "invite", label: "Invité·e", emoji: "👋", group: "invite", hint: "Juste un nom : tu vois et tu rejoins les activités" },
] as const;

export const ACCOUNT_GROUPS = [
  { id: "personnel", label: "Résident·e", emoji: "🏠", description: "Tu publies une activité (bénévolat, aide, vide-grenier…). Ton profil est privé ; tu peux choisir de partager ton niveau et tes badges. Ta publication disparaît après l'événement." },
  { id: "etablissement", label: "Entreprise", emoji: "🏪", description: "Commerce, restaurant, entreprise ou organisme : tu as une page publique avec toutes tes publications." },
  { id: "invite", label: "Invité·e", emoji: "👋", description: "Juste ton nom. Tu vois les publications et tu peux rejoindre une activité, mais tu ne publies pas." },
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
  { id: "construction", label: "Construction / architecture / immobilier", emoji: "🏗️", for: ["entreprise", "commerce"] },
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

// Signalements (« Signaler ») : 5 catégories, chacune avec ses précisions. PRIVÉS : jamais dans les publications.
// On signale une situation à un endroit, jamais une personne (pas de nom, pas de description physique, pas de photo de personne).
// help : qui appeler quand c'est urgent (le signalement ne remplace pas le 911).
export const REPORT_CATEGORIES = [
  {
    id: "itinerance", label: "Itinérance", color: "#7c5cff", photos: false,
    hint: "Une personne semble avoir besoin d'aide",
    help: "Une personne en danger : appelle le 911. Pour l'orienter vers de l'aide (hébergement, repas) : 211.",
    placeholder: "Ex. : une personne dort dans l'entrée d'un commerce fermé depuis ce matin, sans manteau.",
    subtypes: [
      { id: "aide", label: "Personne qui semble avoir besoin d'aide" },
      { id: "froid", label: "Personne exposée au froid ou à la chaleur" },
      { id: "abri", label: "Abri ou campement" },
      { id: "materiel", label: "Matériel laissé sur place" },
    ],
  },
  {
    id: "proprete", label: "Propreté", color: "#22a06b", photos: true,
    hint: "Déchets, poubelle pleine, dépôt sauvage…",
    help: "Seringue à terre : n'y touche pas, signale-la ici avec l'endroit exact.",
    placeholder: "Ex. : la poubelle du coin de la rue déborde depuis deux jours, les sacs sont sur le trottoir.",
    subtypes: [
      { id: "dechets", label: "Déchets au sol" },
      { id: "poubelle", label: "Poubelle pleine" },
      { id: "depot", label: "Dépôt sauvage (meubles, matelas…)" },
      { id: "seringue", label: "Seringue ou matériel souillé" },
      { id: "excrements", label: "Excréments" },
      { id: "autre", label: "Autre" },
    ],
  },
  {
    id: "infraction", label: "Infraction", color: "#e8590c", photos: true,
    hint: "Stationnement interdit, bruit, règlement non respecté",
    help: "Un crime en cours ou une personne en danger : appelle le 911.",
    placeholder: "Ex. : une auto est garée sur la piste cyclable tous les matins vers 8 h.",
    subtypes: [
      { id: "stationnement", label: "Stationnement interdit" },
      { id: "passage", label: "Trottoir ou piste cyclable bloqué" },
      { id: "bruit", label: "Bruit excessif" },
      { id: "affichage", label: "Affichage illégal" },
      { id: "animal", label: "Animal sans laisse" },
      { id: "autre", label: "Autre" },
    ],
  },
  {
    id: "degat", label: "Dégât", color: "#1a73e8", photos: true,
    hint: "Nid-de-poule, lampadaire éteint, trottoir abîmé…",
    help: "Un danger immédiat (fil électrique tombé, fuite importante) : appelle le 911.",
    placeholder: "Ex. : un gros nid-de-poule devant l'arrêt de bus, les vélos doivent faire un écart.",
    subtypes: [
      { id: "chaussee", label: "Nid-de-poule ou chaussée abîmée" },
      { id: "trottoir", label: "Trottoir abîmé" },
      { id: "lampadaire", label: "Lampadaire éteint" },
      { id: "feu", label: "Feu de circulation en panne" },
      { id: "mobilier", label: "Banc, poubelle ou mobilier brisé" },
      { id: "eau", label: "Fuite d'eau" },
      { id: "arbre", label: "Arbre ou branche tombée" },
    ],
  },
  {
    id: "vandalisme", label: "Vandalisme", color: "#d6336c", photos: true,
    hint: "Graffiti, vitre brisée, bien endommagé",
    help: "Quelqu'un est en train de casser quelque chose : appelle le 911.",
    placeholder: "Ex. : la vitrine du local vide a été brisée cette nuit, il y a du verre sur le trottoir.",
    subtypes: [
      { id: "graffiti", label: "Graffiti ou tag" },
      { id: "vitre", label: "Vitre ou vitrine brisée" },
      { id: "mobilier", label: "Mobilier urbain endommagé" },
      { id: "velo", label: "Vélo ou support à vélo vandalisé" },
      { id: "autre", label: "Autre" },
    ],
  },
] as const;

// Suivi d'un signalement : la SDC (Vue SDC) le fait avancer ; l'auteur voit où il en est.
export const REPORT_STATUSES = [
  { id: "recu", label: "Reçu", hint: "Ton signalement est bien arrivé." },
  { id: "en-cours", label: "En traitement", hint: "Quelqu'un s'en occupe." },
  { id: "regle", label: "Réglé", hint: "La situation est réglée." },
] as const;
export type ReportStatusId = (typeof REPORT_STATUSES)[number]["id"];
export const reportStatusOf = (id: string | null | undefined) => REPORT_STATUSES.find((s) => s.id === id) ?? REPORT_STATUSES[0];
export const REPORT_DESCRIPTION_MIN = 10;

// « Quand est-ce que ça arrive ? » (facultatif) : utile pour la Ville (ex. manque de lumière le soir).
export const REPORT_MOMENTS = [
  { id: "maintenant", label: "En ce moment", emoji: "⏱️" },
  { id: "jour", label: "Le jour", emoji: "☀️" },
  { id: "soir", label: "Le soir", emoji: "🌆" },
  { id: "nuit", label: "La nuit", emoji: "🌙" },
  { id: "toujours", label: "Tout le temps", emoji: "🔁" },
] as const;
export type ReportMomentId = (typeof REPORT_MOMENTS)[number]["id"];
export const reportMomentOf = (id: string | null | undefined) => REPORT_MOMENTS.find((m) => m.id === id);
export const MAX_REPORT_PHOTOS = 3;

export type ReportCategoryId = (typeof REPORT_CATEGORIES)[number]["id"];
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const reportCategoryOf = (id: string | null | undefined): ReportCategory | undefined => REPORT_CATEGORIES.find((c) => c.id === id);
export const reportSubtypeOf = (category: string | null | undefined, subtype: string | null | undefined) =>
  reportCategoryOf(category)?.subtypes.find((s) => s.id === subtype);

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
/** Un·e invité·e (juste un nom) peut voir et rejoindre, mais pas publier. */
export const isGuest = (t: string) => t === "invite";
export const GUEST_CANNOT_POST = { error: "Les invité·e·s peuvent voir et rejoindre les activités, mais pas publier. Crée un compte résident ou entreprise.", code: "invite" } as const;
export const sectorOf = (id: string | null | undefined) => SECTORS.find((s) => s.id === id);
export type NeedId = (typeof NEEDS)[number]["id"];
export type ContributionId = (typeof CONTRIBUTIONS)[number]["id"];
export type DateFilterId = (typeof DATE_FILTERS)[number]["id"];

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);
export const actorTypeOf = (id: string) => ACTOR_TYPES.find((a) => a.id === id);
export const needOf = (id: string) => NEEDS.find((n) => n.id === id);
export const contributionOf = (id: string) => CONTRIBUTIONS.find((c) => c.id === id);

export const MAX_IMAGES = 4;

// ---------- Onglet « Entreprises » : publications des commerces, restos, entreprises, organismes ----------
// (les ACTIVITÉS vont toujours dans « Vie Saint-Roch », jamais ici)
export const BUSINESS_POST_TYPES = [
  { id: "promo", label: "Promo", emoji: "🏷️", hint: "Un rabais, une offre spéciale" },
  { id: "nouveaute", label: "Nouveauté", emoji: "✨", hint: "Un nouveau produit, menu, service" },
  { id: "emploi", label: "Emploi", emoji: "📣", hint: "On recrute" },
  { id: "offre", label: "On offre", emoji: "🤝", hint: "Une salle, du matériel, un coup de main pour le quartier" },
  { id: "annonce", label: "Annonce", emoji: "📢", hint: "Horaires, fermeture, travaux, nouvelle adresse…" },
] as const;
export type BusinessPostTypeId = (typeof BUSINESS_POST_TYPES)[number]["id"];
export const businessPostTypeOf = (id: string | null | undefined) => BUSINESS_POST_TYPES.find((t) => t.id === id);
export const BUSINESS_ONLY = { error: "Seuls les comptes Entreprise (commerce, resto, entreprise, organisme) publient dans l'onglet Entreprises. Pour une activité, utilise « Vie Saint-Roch ».", code: "entreprise" } as const;
