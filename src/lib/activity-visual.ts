import type { Idea } from "./types";

// Illustrations par sujet, sans changer les photos publiées ni les données d'une activité.
const SUBJECTS: readonly [RegExp, string][] = [
  [/\b(jeux?|societe|echecs|cartes|ludique)\b/, "jeux.jpg"],
  [/\b(lecture|livres?|conte|contes|bibliotheque|poesie)\b/, "lecture-photo.jpg"],
  [/\b(velo|velos|cyclisme|bicyclette|reparation)\b/, "velo-photo.jpg"],
  [/\b(jardin|jardinage|plantes?|plantation|semis|nature|potager|verdissement)\b/, "jardin-photo.jpg"],
  [/\b(repas|cuisine|cuisiner|cafe|brunch|soupe|pique[ -]?nique|degustation|resto|restaurant)\b/, "repas-photo.jpg"],
  [/\b(musique|musical|concert|concerts|chant|chorale|jazz|danse|dansant)\b/, "musique-photo.jpg"],
  [/\b(mode|friperie|friperies|vetements?|couture|tricot|seconde main|defile)\b/, "mode-photo.jpg"],
  [/\b(yoga|meditation|etirements?|respiration)\b/, "yoga-photo.jpg"],
  [/\b(sport|sports|course|courir|football|soccer|randonnee|balade|promenade)\b/, "sport-photo.jpg"],
  [/\b(art|arts|artistes?|vernissage|exposition|galerie|peinture|murale|dessin)\b/, "art.jpg"],
  [/\b(marche|recolte|legumes?|fruits?|producteurs?|epicerie)\b/, "marche.jpg"],
  [/\b(atelier|bricolage|menuiserie|fabriquer|fabrication|outils?|corvee|nettoyage)\b/, "atelier.jpg"],
  [/\b(tech|technologie|numerique|programmation|informatique|etude|coworking|rencontre|reunion)\b/, "tech.jpg"],
];

export function activityVisual(idea: Pick<Idea, "title" | "category">): string | null {
  const title = idea.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const subject = SUBJECTS.find(([pattern]) => pattern.test(title));
  // Sans sujet identifiable, l'affiche avec le titre remplace la photo générique répétée.
  return subject ? `/images/activities/${subject[1]}` : null;
}
