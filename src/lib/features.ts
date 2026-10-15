// Les 9 fonctionnalités de Complices (une par problème de Saint-Roch).
// status « live » = codée ; « bientot » = page de présentation seulement (pas encore codée).

export type Feature = {
  slug: string;
  href: string;
  problem: number;
  emoji: string;
  label: string; // libellé court pour les onglets
  title: string;
  problemLabel: string;
  pitch: string;
  bullets: string[];
  planActions?: string;
  status: "live" | "bientot";
};

export const FEATURES: Feature[] = [
  {
    slug: "idees", href: "/vie", problem: 1, emoji: "💡", label: "Idées", status: "live",
    title: "Lancer une idée",
    problemLabel: "Les acteurs ne se connaissent pas, les bonnes idées meurent",
    pitch: "Publie ton idée pour le quartier : n'importe qui peut se proposer comme complice pour t'aider.",
    bullets: ["Publier une initiative avec des images", "Se proposer comme complice (bénévole, matériel, lieu, commandite…)", "Badges : Super voisin, Bonne personne…"],
  },
  {
    slug: "ca-se-passe", href: "/vie", problem: 2, emoji: "📅", label: "Accueil", status: "live",
    title: "Ça se passe à Saint-Roch",
    problemLabel: "On ne sait pas ce qui se passe dans le quartier",
    pitch: "Un seul endroit pour tout ce qui se passe près de chez toi, avec des filtres simples.",
    bullets: ["Cartes cliquables", "Filtres : catégorie, organisé par, date", "Recherche"],
  },
  {
    slug: "signaler", href: "/signaler", problem: 6, emoji: "📍", label: "Signaler", status: "live",
    title: "Signaler un besoin ou un problème",
    problemLabel: "Les besoins des habitants (épicerie qui manque, coin sombre, saleté, vol…) ne sont localisés nulle part",
    pitch: "Comme les applis 311 : cherche une adresse ou utilise ta position, place la pastille en glissant la carte, dis ce qui manque ou ce qui ne va pas, ajoute une photo. Chaque personne ne voit que les siennes ; regroupées par secteur, elles montrent où sont les besoins.",
    bullets: [
      "Carte de Saint-Roch (limite officielle du quartier), recherche d'adresse et « Ma position »",
      "Pastille placée au mètre près, avec l'adresse affichée en direct (OpenStreetMap)",
      "Un besoin (épicerie, bancs, toilettes, verdure…) ou un problème (lumière, saleté, vol…), le moment (jour, soir, nuit) et jusqu'à 3 photos",
      "Numéro de suivi (ex. SR-4F2A9C) ; signalements et photos privés",
      "Plus tard : vue par secteur pour la Ville et transmission (non construites)",
    ],
    planActions: "Actions 1.6, 1.10, 1.15 et 3.5 du Plan Saint-Roch",
  },
  {
    slug: "soirees", href: "/soirees", problem: 5, emoji: "🌙", label: "Soirées", status: "bientot",
    title: "Les Soirées Complices",
    problemLabel: "Le soir est mort : peu de lumière, les commerces ferment tôt",
    pitch: "Les commerces d'une rue restent ouverts ensemble un soir… si assez de gens confirment leur venue.",
    bullets: ["Compteur « 87 / 100 personnes viennent jeudi »", "Seuil atteint : la soirée est confirmée et la rue s'allume sur la carte", "Trajet éclairé et stationnement le plus proche"],
    planActions: "Actions 1.10, 2.2 et 3.2 du Plan Saint-Roch",
  },
  {
    slug: "midi", href: "/midi", problem: 3, emoji: "🍽️", label: "Midi", status: "bientot",
    title: "Le Midi Complice",
    problemLabel: "Moins de monde au quotidien (télétravail, achat en ligne)",
    pitch: "Des raisons concrètes de venir à Saint-Roch le midi : dîners-rencontres, pauses actives, rabais travailleurs.",
    bullets: ["Table complice : dîner partagé entre travailleurs du quartier", "Pause active de 20 minutes", "Rabais travailleurs chez les commerces"],
    planActions: "Action 3.2 du Plan Saint-Roch",
  },
  {
    slug: "vitrines", href: "/vitrines", problem: 4, emoji: "🟠", label: "Vitrines", status: "bientot",
    title: "Vitrines à remplir",
    problemLabel: "Les commerces souffrent : fermetures, locaux vides",
    pitch: "Les locaux vides deviennent visibles : vote pour le commerce que tu veux, ou occupe la vitrine en attendant.",
    bullets: ["« Ce que je veux ici » : la preuve de la demande", "Vitrine éphémère pour artistes, étudiants, organismes", "Promos et nouveautés des commerçants"],
    planActions: "Actions 2.8, 3.5 et 3.10 du Plan Saint-Roch",
  },
  {
    slug: "serein", href: "/serein", problem: 6, emoji: "🤝", label: "Serein", status: "bientot",
    title: "Saint-Roch serein",
    problemLabel: "Sécurité et cohabitation",
    pitch: "Se sentir en sécurité et cohabiter avec dignité : trajets éclairés, lieux-relais, bonnes ressources.",
    bullets: ["Trajet rassurant (le plus éclairé et le plus animé)", "Lieux-relais chez des commerces partenaires", "« Quelqu'un a besoin d'aide ? » : qui appeler (jamais de signalement de personnes)", "Carte des services : toilettes, eau, Wi-Fi, répit"],
    planActions: "Actions 1.2, 1.5, 1.6 et 1.10 du Plan Saint-Roch",
  },
  {
    slug: "bonnes-nouvelles", href: "/bonnes-nouvelles", problem: 7, emoji: "📣", label: "Nouvelles", status: "bientot",
    title: "Les bonnes nouvelles de Saint-Roch",
    problemLabel: "L'image du quartier est négative dans les médias",
    pitch: "Chaque initiative réussie devient une histoire positive, prête à partager.",
    bullets: ["Carte-souvenir à partager en 1 clic", "Compteur public « Ce mois-ci à Saint-Roch »", "Les visages du quartier"],
    planActions: "Actions 2.3, 2.6 et 3.9 du Plan Saint-Roch",
  },
  {
    slug: "y-aller", href: "/y-aller", problem: 8, emoji: "🚗", label: "Y aller", status: "live",
    title: "Y aller facilement",
    problemLabel: "Stationnement, chantiers, tramway",
    pitch: "D'où je pars, où je vais : le trajet en auto, en bus, en vélo ou à pied, et surtout où se garer à Saint-Roch.",
    bullets: [
      "Suggestions d'adresses pendant la frappe (adresses officielles de la Ville, lieux, événements)",
      "Auto : les stationnements les plus proches (8 municipaux de la Ville + ceux d'OpenStreetMap), places et minutes à pied",
      "Bus : la ligne du RTC à prendre et les prochains passages ; vélo : les stations àVélo en direct",
      "Carte : stationnements, vélos, arrêts de bus, bornes et événements numérotés (rouge = en direct)",
    ],
    planActions: "Action 3.6 du Plan Saint-Roch",
  },
  {
    slug: "mon-saint-roch", href: "/mon-saint-roch", problem: 9, emoji: "🏅", label: "Passeport", status: "bientot",
    title: "Mon Saint-Roch",
    problemLabel: "Appartenance faible : nouveaux arrivants, personnes seules, touristes",
    pitch: "Des parcours selon qui tu es, un Passeport avec badges et des quêtes collectives pour tout le quartier.",
    bullets: ["Bienvenue voisin (7 jours, 7 découvertes)", "Descends à Saint-Roch (touristes)", "Quêtes collectives : « 2 000 participations = une nouvelle murale »"],
    planActions: "Actions 2.3 et 2.7 du Plan Saint-Roch",
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug)!;
