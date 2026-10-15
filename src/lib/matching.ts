import "server-only";
import { categoryOf, isEstablishment, type NeedId } from "./constants";
import { listMatchCandidates, listScheduledIdeas, toPublicUser } from "./db";
import { CITY_LINKS, PLAN_ACTIONS } from "./quartier";
import type { MatchResult } from "./types";

// Problème 1 : « Trouver mes complices ». Moteur LOCAL et explicable (pas d'IA externe, aucune donnée confidentielle) :
// 1. on reconnaît le type d'activité à partir des mots de la phrase ;
// 2. on note les comptes de l'app (secteur, mots du profil, rue, aide déjà donnée) et on explique « pourquoi lui » ;
// 3. on propose un lieu public adapté, ce qu'il faut (avec les vrais liens de la Ville), une date sans conflit et l'action du Plan.

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ");

type Profile = {
  id: string; label: string; emoji: string; words: string[]; category: string; sectors: string[];
  places: string[]; needs: NeedId[]; logistics: string[]; plan: string[]; slot: { day: number; hour: number; minute?: number };
};

const PROFILES: Profile[] = [
  { id: "vente", label: "Vente ou marché", emoji: "🛍️", words: ["vente", "trottoir", "marche aux puces", "bazar", "friperie", "braderie", "garage", "kiosque", "marche", "troc", "echange"], category: "commerce", sectors: ["boutique", "alimentation", "cafe", "restaurant", "economie-sociale"], places: ["Rue Saint-Joseph Est", "Parvis de l'église Saint-Roch"], needs: ["participants", "materiel", "lieu"], logistics: ["tables", "autorisation", "affiche"], plan: ["2.2", "2.6"], slot: { day: 6, hour: 10 } },
  { id: "fete", label: "Fête de quartier", emoji: "🎉", words: ["fete", "party", "celebr", "halloween", "noel", "carnaval", "voisins", "bbq", "barbecue", "epluchette", "festival"], category: "communautaire", sectors: ["communautaire", "cafe", "restaurant", "boutique", "culture"], places: ["Parvis de l'église Saint-Roch", "Parc Victoria", "Parc des Pékans"], needs: ["benevoles", "materiel", "commandite", "participants"], logistics: ["tables", "voisinage", "electricite", "toilettes"], plan: ["2.1", "2.2"], slot: { day: 6, hour: 14 } },
  { id: "art", label: "Projet d'art", emoji: "🎨", words: ["murale", "mural", "art", "expo", "peinture", "dessin", "graffiti", "galerie", "photo", "sculpture", "artiste", "creation"], category: "culturel", sectors: ["culture", "tech", "services"], places: ["Îlot Fleurie", "Rue Saint-Joseph Est", "Bibliothèque Gabrielle-Roy"], needs: ["expertise", "materiel", "commandite", "benevoles"], logistics: ["materiel_art", "autorisation"], plan: ["2.6", "2.8"], slot: { day: 6, hour: 10 } },
  { id: "sport", label: "Sport et jeux", emoji: "⚽", words: ["tournoi", "petanque", "echecs", "soccer", "basket", "yoga", "course", "sport", "volley", "frisbee", "velo", "jeux"], category: "sport", sectors: ["sport-loisir", "cafe", "services"], places: ["Parvis de l'église Saint-Roch", "Parc Victoria", "Parc de la Pointe-aux-Lièvres"], needs: ["participants", "materiel", "lieu"], logistics: ["materiel_sport", "autorisation"], plan: ["1.15", "1.11"], slot: { day: 6, hour: 13 } },
  { id: "spectacle", label: "Spectacle ou musique", emoji: "🎶", words: ["concert", "spectacle", "musique", "chanson", "dj", "cinema", "film", "theatre", "danse", "show", "impro", "karaoke", "conte"], category: "culturel", sectors: ["culture", "bar", "restaurant", "cafe"], places: ["Place de l'Université-du-Québec", "Parvis de l'église Saint-Roch", "Jardin Jean-Paul-L'Allier"], needs: ["expertise", "materiel", "commandite", "lieu"], logistics: ["electricite", "scene", "autorisation", "toilettes"], plan: ["2.1", "2.2"], slot: { day: 5, hour: 19 } },
  { id: "vert", label: "Verdissement et propreté", emoji: "🌱", words: ["nettoyage", "corvee", "verdissement", "plantation", "planter", "jardin", "fleur", "arbre", "menage", "ramassage", "dechet", "compost", "recyclage", "propre"], category: "environnement", sectors: ["services", "communautaire", "alimentation"], places: ["Jardin Jean-Paul-L'Allier", "Parc des Pékans", "Parc Victoria"], needs: ["benevoles", "materiel"], logistics: ["gants", "autorisation"], plan: ["1.12", "1.15"], slot: { day: 6, hour: 9, minute: 30 } },
  { id: "savoir", label: "Atelier ou rencontre", emoji: "📚", words: ["lecture", "livre", "conference", "atelier", "cours", "club", "discussion", "quiz", "jeux de societe", "langue", "conversation", "tricot", "couture", "informatique", " cv", "emploi", "formation"], category: "culturel", sectors: ["culture", "communautaire", "institution", "economie-sociale"], places: ["Bibliothèque Gabrielle-Roy"], needs: ["lieu", "participants", "expertise"], logistics: ["salle"], plan: ["2.5", "1.4"], slot: { day: 3, hour: 18, minute: 30 } },
  { id: "repas", label: "Repas partagé", emoji: "🍲", words: ["repas", "diner", "souper", "pique-nique", "piquenique", "cuisine", "soupe", "brunch", "dejeuner", "potluck", "degustation", "popote", "frigo"], category: "communautaire", sectors: ["restaurant", "cafe", "alimentation", "bar"], places: ["Parvis de l'église Saint-Roch", "Jardin Jean-Paul-L'Allier", "Rue Saint-Joseph Est"], needs: ["commandite", "lieu", "materiel", "benevoles"], logistics: ["tables", "electricite", "autorisation"], plan: ["2.6", "3.2"], slot: { day: 3, hour: 12 } },
  { id: "tech", label: "Projet tech ou jeu vidéo", emoji: "🎮", words: ["jeu video", "jeux video", "game jam", "hackathon", "code", "programmation", "numerique", "robot", "tech", "intelligence artificielle", "application"], category: "culturel", sectors: ["tech", "institution", "culture"], places: ["Place de l'Université-du-Québec", "Bibliothèque Gabrielle-Roy"], needs: ["lieu", "expertise", "commandite", "participants"], logistics: ["wifi", "salle"], plan: ["2.8"], slot: { day: 5, hour: 18 } },
  { id: "solidarite", label: "Entraide", emoji: "💛", words: ["collecte", " don", "dons", "vetement", "banque alimentaire", "entraide", "solidar", "benevol", "aines", "personnes seules", "accueil", "nouveaux arrivants", "immigr"], category: "benevolat", sectors: ["communautaire", "economie-sociale", "alimentation", "institution"], places: ["Bibliothèque Gabrielle-Roy", "Parvis de l'église Saint-Roch"], needs: ["benevoles", "lieu", "materiel"], logistics: ["salle", "tables"], plan: ["1.2", "1.4"], slot: { day: 6, hour: 10 } },
];
const DEFAULT: Profile = { id: "quartier", label: "Activité de quartier", emoji: "💡", words: [], category: "communautaire", sectors: ["communautaire", "cafe", "culture", "boutique"], places: ["Parvis de l'église Saint-Roch"], needs: ["participants", "benevoles"], logistics: ["autorisation", "affiche"], plan: ["2.2"], slot: { day: 6, hour: 13 } };

// Lieux publics bien connus (information publique)
const PLACE_INFO: Record<string, { why: string; words: string[] }> = {
  "Parvis de l'église Saint-Roch": { why: "Grande place piétonne au cœur du quartier, très passante.", words: ["parvis", "eglise"] },
  "Jardin Jean-Paul-L'Allier": { why: "Jardin en terrasses, calme et ombragé, parfait pour les familles.", words: ["jean-paul", "allier"] },
  "Bibliothèque Gabrielle-Roy": { why: "Lieu public chauffé et accessible, avec des salles.", words: ["gabrielle", "bibliotheque"] },
  "Place de l'Université-du-Québec": { why: "Grande place ouverte, au cœur du futur quartier universitaire.", words: ["universite", "place de l uq"] },
  "Rue Saint-Joseph Est": { why: "Artère commerçante : les commerces sont juste là.", words: ["saint-joseph", "st-joseph"] },
  "Parc des Pékans": { why: "Nouveau parc de quartier, un ancien stationnement transformé.", words: ["pekans"] },
  "Parc Victoria": { why: "Grand parc avec de l'espace pour bouger, au bord de la rivière.", words: ["victoria"] },
  "Parc de la Pointe-aux-Lièvres": { why: "Grand parc riverain, avec sentiers et espaces verts.", words: ["pointe-aux-lievres", "pointe aux lievres"] },
  "Marina Saint-Roch": { why: "Au bord de la rivière Saint-Charles.", words: ["marina"] },
  "Îlot Fleurie": { why: "Haut lieu de l'art urbain, sous les piliers de l'autoroute.", words: ["fleurie"] },
};

const LOGISTICS: Record<string, MatchResult["logistics"][number]> = {
  tables: { label: "Tables et chaises", detail: "Les organismes reconnus peuvent en réserver à la Ville, au moins 10 jours ouvrables d'avance.", link: CITY_LINKS.materiel },
  autorisation: { label: "Autorisation de la Ville", detail: "Une activité sur une place ou dans un parc demande une autorisation, environ 3 mois d'avance.", link: CITY_LINKS.evenement },
  voisinage: { label: "Fermer une rue ou utiliser un parc entre voisins", detail: "La « Fête du voisinage » de la Ville est la voie la plus simple pour les résidents.", link: CITY_LINKS.feteVoisins },
  electricite: { label: "Électricité", detail: "Un branchement ou une petite génératrice silencieuse, à prévoir dans ta demande." },
  toilettes: { label: "Toilettes", detail: "Repère les toilettes accessibles les plus proches, ou un commerce partenaire." },
  scene: { label: "Petite scène et sono", detail: "Un complice du milieu culturel peut en prêter." },
  materiel_art: { label: "Matériel d'art", detail: "Peinture, pinceaux et bâches : une commandite de quincaillerie ou de commerce." },
  materiel_sport: { label: "Matériel de jeu", detail: "Boules de pétanque, échiquiers, ballons…" },
  gants: { label: "Gants, sacs et outils", detail: "La quincaillerie du quartier peut en prêter." },
  salle: { label: "Une salle", detail: "Tables, chaises et un endroit au chaud." },
  wifi: { label: "Wi-Fi et prises", detail: "Indispensable pour les ordinateurs." },
  affiche: { label: "Faire connaître", detail: "Ton idée est publiée dans Complices : partage le lien autour de toi." },
};

const SECTOR_HELP: Record<string, { why: string; contribution: string }> = {
  cafe: { why: "Café du quartier : peut offrir le café ou accueillir", contribution: "commandite" },
  restaurant: { why: "Restaurant : peut commanditer des bouchées ou accueillir", contribution: "commandite" },
  bar: { why: "Bar : peut accueillir une soirée", contribution: "lieu" },
  boutique: { why: "Boutique : peut tenir un kiosque et attirer ses clients", contribution: "participer" },
  alimentation: { why: "Commerce d'alimentation : peut fournir ou commanditer", contribution: "commandite" },
  services: { why: "Peut prêter du matériel et des outils", contribution: "materiel" },
  culture: { why: "Milieu culturel : expertise et réseau d'artistes", contribution: "expertise" },
  tech: { why: "Studio créatif : expertise et réseau", contribution: "expertise" },
  communautaire: { why: "Organisme communautaire : bénévoles et réseau du quartier", contribution: "benevole" },
  institution: { why: "Institution : peut offrir une salle", contribution: "lieu" },
  "economie-sociale": { why: "Économie sociale : réseau d'entraide", contribution: "benevole" },
  "sport-loisir": { why: "Organisme sportif : matériel et animation", contribution: "materiel" },
  hebergement: { why: "Hébergement : peut accueillir des visiteurs", contribution: "lieu" },
  bureau: { why: "Bureau du quartier : peut mobiliser son équipe", contribution: "participer" },
};

const has = (text: string, w: string) => text.includes(w);
const stem = (w: string) => w.replace(/(es|s|x)$/, "");

/** « Je veux organiser une vente-trottoir… » → « Vente-trottoir… » */
function titleFrom(text: string): string {
  let t = text.trim().replace(/[.!…\s]+$/, "");
  t = t.replace(/^(je (veux|voudrais|souhaite|souhaiterais|aimerais|propose)|j['’](aimerais|ai envie d['’]?)|on (veut|pourrait|voudrait|devrait)|nous (voulons|aimerions|voudrions)|et si on|id[ée]e\s*:)\s*/i, "");
  t = t.replace(/^(organiser|faire|lancer|cr[ée]er|monter|proposer|mettre sur pied)\s+/i, "");
  t = t.replace(/^(un|une|des|le|la|les)\s+/i, (m) => (/^(un|une)\s/i.test(m) ? "" : m));
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.length > 90 ? `${t.slice(0, 87).trimEnd()}…` : t || "Mon idée pour Saint-Roch";
}

function nextSlot(slot: Profile["slot"], minDays: number, skipWeeks: number) {
  const d = new Date();
  d.setDate(d.getDate() + minDays + skipWeeks * 7);
  while (d.getDay() !== slot.day) d.setDate(d.getDate() + 1);
  d.setHours(slot.hour, slot.minute ?? 0, 0, 0);
  return d;
}

const dayLabel = (d: Date) => new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long" }).format(d);

export function findComplices(text: string, meId: string | null): MatchResult {
  const t = ` ${fold(text)} `;
  const scored = PROFILES.map((p) => ({ p, n: p.words.filter((w) => has(t, w)).length })).sort((a, b) => b.n - a.n);
  const profile = scored[0].n > 0 ? scored[0].p : DEFAULT;

  // Modificateurs : le midi, en famille
  const slot = { ...profile.slot };
  const plan = [...profile.plan];
  const midi = /\b(midi|diner|lunch|pause|travailleurs?|bureau)\b/.test(t);
  if (midi) Object.assign(slot, { day: 3, hour: 12, minute: 0 });
  if (midi && !plan.includes("3.2")) plan.unshift("3.2");
  const famille = /\b(enfants?|famille|parents|bebes?|jeunes|ados)\b/.test(t);
  if (famille && !plan.includes("2.1")) plan.push("2.1");

  // 👥 Qui peut t'aider
  const original = new Map<string, string>(); // racine → mot tel qu'écrit (« friperi » → « friperies »)
  for (const w of text.split(/[^\p{L}0-9-]+/u)) if (w.length >= 5) original.set(stem(fold(w)), w.toLowerCase());
  const words = [...original.keys()];
  const mentionsStJoseph = has(t, "saint-joseph") || has(t, "st-joseph");
  const candidates = listMatchCandidates(meId).map((c) => {
    const why: string[] = [];
    let score = 0;
    const establishment = isEstablishment(c.account_type);
    const help = c.sector ? SECTOR_HELP[c.sector] : undefined;
    if (c.sector && profile.sectors.includes(c.sector) && help) {
      score += 4 + (profile.sectors.length - profile.sectors.indexOf(c.sector)) * 0.2;
      why.push(help.why);
    }
    const profileText = fold(`${c.display_name} ${c.description ?? ""}`);
    const hits = words.filter((w) => profileText.includes(w));
    if (hits.length) {
      score += Math.min(6, hits.length * 3);
      why.push(`Son profil parle de « ${original.get(hits[0]) ?? hits[0]} », comme ton idée`);
    }
    if (mentionsStJoseph && fold(c.address ?? "").includes("saint-joseph")) {
      score += 2;
      why.push("Installé·e sur la rue Saint-Joseph");
    }
    const cats = (c.helped_categories ?? "").split(",");
    if (cats.includes(profile.category)) {
      score += 3;
      why.push(`A déjà aidé une initiative « ${categoryOf(profile.category)?.label.toLowerCase()} »`);
    } else if (c.helped > 0) {
      score += 1;
      why.push(`A déjà donné un coup de main ${c.helped > 1 ? `${c.helped} fois` : "une fois"}`);
    }
    if (!establishment && score > 0) score -= 0.5; // à égalité, on privilégie commerces et organismes
    const past = (c.contributions ?? "").split(",").filter((x) => x && x !== "participer");
    const contribution = help?.contribution ?? (past[0] || "benevole");
    return { c, score, why, contribution };
  });

  const perSector = new Map<string, number>();
  const helpers = candidates
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .filter((x) => {
      const k = x.c.sector ?? x.c.account_type;
      perSector.set(k, (perSector.get(k) ?? 0) + 1);
      return perSector.get(k)! <= 2;
    })
    .slice(0, 5)
    .map((x) => ({ user: toPublicUser(x.c), contribution: x.contribution, why: x.why.slice(0, 2) }));

  // 📍 Où
  const named = Object.entries(PLACE_INFO).find(([, info]) => info.words.some((w) => has(t, w)));
  const placeName = named ? named[0] : famille ? (profile.places.find((p) => p.startsWith("Parc") || p.startsWith("Jardin")) ?? profile.places[0]) : profile.places[0];
  const place = { name: placeName, why: named ? `Le lieu que tu as nommé. ${PLACE_INFO[placeName].why}` : PLACE_INFO[placeName]?.why ?? "Lieu public du quartier." };

  // 📅 Quand : une date sans conflit avec les autres activités de Complices
  const scheduled = listScheduledIdeas();
  let when = nextSlot(slot, 7, 0);
  let conflict: string | null = null;
  for (let k = 0; k < 4; k++) {
    const candidate = nextSlot(slot, 7, k);
    const clash = scheduled.find((s) => {
      const d = new Date(s.starts_at);
      return d.toDateString() === candidate.toDateString() && Math.abs(d.getTime() - candidate.getTime()) < 3 * 3_600_000;
    });
    when = candidate;
    if (!clash) break;
    conflict ??= `Le ${dayLabel(candidate)} est déjà pris par « ${clash.title} »`;
  }
  const whenWhy = conflict ? `${conflict} : on te propose le ${dayLabel(when)}.` : "Aucune autre activité prévue dans Complices à ce moment-là.";

  return {
    activity: { id: profile.id, label: profile.label, emoji: profile.emoji },
    title: titleFrom(text),
    category: profile.category,
    helpers,
    place,
    needs: profile.needs,
    logistics: profile.logistics.map((k) => LOGISTICS[k]).filter(Boolean),
    when: { iso: when.toISOString(), why: whenWhy },
    plan: [...new Set(plan)].slice(0, 3).map((id) => ({ id, label: PLAN_ACTIONS[id] ?? "" })).filter((a) => a.label),
  };
}
