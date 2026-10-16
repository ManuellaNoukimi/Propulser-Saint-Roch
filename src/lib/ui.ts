// Couleurs et dégradés pour l'interface (aucune donnée).

// Papiers colorés des affiches de la galerie.
// Style HACKATHON26 : affiches en dégradé de deux couleurs de la charte (vert #7AB648, bleu #0096D6, bleu nuit
// #1F3A4D) sous un léger voile bleu nuit pour garder le texte blanc lisible. Aucune autre couleur.
const VEIL = "linear-gradient(rgb(31 58 77 / .22), rgb(31 58 77 / .22))";
const duo = (a: string, b: string) => ({ background: `${VEIL}, linear-gradient(135deg, ${a}, ${b})`, ink: "#ffffff", accent: "#ffffff" });
export const CATEGORY_PALETTES = {
  culturel: duo("#1f3a4d", "#0096d6"),
  communautaire: duo("#0096d6", "#7ab648"),
  benevolat: duo("#7ab648", "#1f3a4d"),
  recrutement: duo("#1f3a4d", "#7ab648"),
  sport: duo("#0096d6", "#1f3a4d"),
  commerce: duo("#7ab648", "#0096d6"),
  environnement: duo("#7ab648", "#7ab648"),
};

// Fonds des publications sans photo (façon « publication texte »)
export const CATEGORY_GRADIENTS: Record<string, string> = {
  culturel: "linear-gradient(135deg, #77429b 0%, #a53d76 100%)",
  communautaire: "linear-gradient(135deg, #b44c32 0%, #9b3863 100%)",
  benevolat: "linear-gradient(135deg, #a66a25 0%, #a34337 100%)",
  recrutement: "linear-gradient(135deg, #3c579e 0%, #674590 100%)",
  sport: "linear-gradient(135deg, #167a78 0%, #28537c 100%)",
  commerce: "linear-gradient(135deg, #b45b2d 0%, #9c3b4e 100%)",
  environnement: "linear-gradient(135deg, #33765c 0%, #496d3b 100%)",
};

const AVATAR_GRADIENTS = [
  "#1f3a4d",
  "#335f45",
  "#245b75",
  "#37576b",
  "#43622d",
  "#1f3a4d",
  "#245b75",
];

export function avatarGradient(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
