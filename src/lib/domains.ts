// Domaines d'activité pour « Collaborer » : trouver les entreprises qui font la même chose (ou plusieurs choses
// en commun). Utilisable dans le navigateur et sur le serveur. Une entreprise peut avoir plusieurs domaines.
// Classement : activité officielle (liste SDC) d'abord, sinon mots-clés du nom ou de la description, sinon secteur choisi.

export const DOMAINS = [
  { id: "ti", label: "Technologies et informatique", short: "Techno / TI" },
  { id: "creatif", label: "Médias, création et jeux vidéo", short: "Création" },
  { id: "construction", label: "Construction, architecture et immobilier", short: "Construction" },
  { id: "pro", label: "Services professionnels et finances", short: "Services pro" },
  { id: "restauration", label: "Restauration, cafés et bars", short: "Restauration" },
  { id: "commerce", label: "Commerce de détail", short: "Commerce" },
  { id: "sante", label: "Santé et soins personnels", short: "Santé" },
  { id: "culture", label: "Culture, spectacles et loisirs", short: "Culture" },
  { id: "social", label: "Économie sociale, organismes et syndicats", short: "Économie sociale" },
  { id: "institution", label: "Institutions et éducation", short: "Institutions" },
  { id: "hebergement", label: "Hébergement et tourisme", short: "Hébergement" },
] as const;
export type DomainId = (typeof DOMAINS)[number]["id"];
export const domainOf = (id: string) => DOMAINS.find((d) => d.id === id);

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Activité officielle (colonne « Activité commerciale » de la liste SDC) → domaines
const ACTIVITY_RULES: [RegExp, DomainId[]][] = [
  [/services informatiques|services technologiques|fournisseur de services internet|conception de sites/, ["ti"]],
  [/jeux video/, ["ti", "creatif"]],
  [/services mediatiques|services marketing|services communications|graphisme|edition|production (video|multimedia)|studio d.enregistrement/, ["creatif"]],
  [/construction|entrepreneur general|architecte|immobili/, ["construction"]],
  [/services financiers|services professionnels|juridique|assurance|comptab|banque/, ["pro"]],
  [/restauration|cafe|bistro|brasserie|pizzeria|bar\b|bar-|boulangerie|traiteur/, ["restauration"]],
  [/boutique|commerce de detail|friperie|librairie|magasin|pharmacie|depanneur|marche d.alimentation|marchand|vapotage/, ["commerce"]],
  [/services de sante|services personnels|optometrie|chiropratique|coiffure|barbier|manucure|toilettage/, ["sante"]],
  [/compagnie de danse|studio de danse|salle de spectacle|jeu d.evasion|simulateur|bibliotheque|services culturels|evenementiel|organisation d.evenements/, ["culture"]],
  [/organisme|association|societe de developpement|services sociaux/, ["social"]],
  [/organisme culturel|loisir culturel|patrimoin|theatre|musique|chorale|danse|arts? visuels|cinema|metiers d.art|cirque|litteraire/, ["culture"]],
  [/sports?\b|plein air|loisirs?\b|organise des evenements/, ["culture"]],
  [/agence gouvernementale|services educatifs|garderie|universite|ecole/, ["institution"]],
  [/hotel|auberge/, ["hebergement"]],
];

// Mots-clés dans un nom ou une description → domaines (quand l'activité n'est pas connue)
const NAME_RULES: [RegExp, DomainId[]][] = [
  [/informatique|logiciel|software|\btech|techno|numerique|digital|donnees|\bdata\b|\bweb\b|cyber|systemes|intelligence artificielle|\bia\b|\bti\b|\bit\b|robot|cloud|interactif|interactive|\blabs?\b|developpement web/, ["ti"]],
  [/jeux? video|\bgames?\b|gaming/, ["ti", "creatif"]],
  [/\bstudios?\b|productions?|creatif|creatifs|\bvideo\b|\bmedias?\b|communications?|marketing|design|graphi|publicit|\bfilms?\b|animation|multimedia|agence/, ["creatif"]],
  [/construction|constructions|entrepreneur|renovation|batiment|architect|ingenier|ingenieur|immobili|plomberie|electricit|toiture|beton|excavation|menuiserie|chantier/, ["construction"]],
  [/avocats?|juridique|notaires?|comptab|\bcpa\b|conseils?\b|consultants?|associes|assurances?|financ|fiscal|ressources humaines|\brh\b/, ["pro"]],
  [/restaurant|\bcafe|bistro|pizza|\bbar\b|brasserie|boulangerie|traiteur|sushi|resto/, ["restauration"]],
  [/boutique|epicerie|depanneur|pharmacie|librairie|friperie|magasin/, ["commerce"]],
  [/clinique|\bsante\b|dentaire|massage|physio|psycholog|coiffure|salon|optom|chiropra|esthetique/, ["sante"]],
  [/theatre|danse|musique|spectacle|galerie|cinema|festival|\bart\b|artiste/, ["culture"]],
  [/federation|cooperati|\bcoop\b|syndicat|\bcsn\b|association|regroupement|comite|entraide|carrefour|fondation|solidaire|economie sociale|organisme|\baide\b/, ["social"]],
  [/universite|ecole|\binrs\b|ministere|gouvernement|college|cegep|ville de quebec/, ["institution"]],
  [/hotel|auberge|hostel/, ["hebergement"]],
];

// Secteur choisi à l'inscription (comptes Complices) → domaines
const SECTOR_DOMAINS: Record<string, DomainId[]> = {
  restaurant: ["restauration"], cafe: ["restauration"], bar: ["restauration"],
  boutique: ["commerce"], alimentation: ["commerce"], services: ["sante"],
  culture: ["culture"], hebergement: ["hebergement"], bureau: ["pro"], tech: ["ti", "creatif"],
  construction: ["construction"], "economie-sociale": ["social"], institution: ["institution"],
  communautaire: ["social"], "sport-loisir": ["culture"],
};

function apply(text: string, rules: [RegExp, DomainId[]][]): DomainId[] {
  const t = fold(text);
  const out = new Set<DomainId>();
  for (const [re, ids] of rules) if (re.test(t)) ids.forEach((id) => out.add(id));
  return [...out];
}

/** Domaines d'une entreprise : activité officielle, sinon nom / description, plus le secteur choisi. */
export function domainsFor({ activity, name, description, sector, accountType, nonprofit }: {
  activity?: string | null; name?: string | null; description?: string | null; sector?: string | null; accountType?: string | null; nonprofit?: boolean;
}): DomainId[] {
  const out = new Set<DomainId>();
  if (activity) apply(activity, ACTIVITY_RULES).forEach((d) => out.add(d));
  if (!out.size && name) apply(name, NAME_RULES).forEach((d) => out.add(d));
  if (description) apply(description, NAME_RULES).forEach((d) => out.add(d));
  if (sector && SECTOR_DOMAINS[sector]) SECTOR_DOMAINS[sector].forEach((d) => out.add(d));
  if (!out.size && (accountType === "organisme" || nonprofit)) out.add("social");
  return DOMAINS.map((d) => d.id).filter((id) => out.has(id));
}
