// Couleurs et dégradés pour l'interface (aucune donnée).

// Papiers colorés des affiches de la galerie.
export const CATEGORY_PALETTES = {
  culturel: { background: "#eee4ff", ink: "#39235d", accent: "#8053b8" },
  communautaire: { background: "#dff3ed", ink: "#204f47", accent: "#3c8b78" },
  benevolat: { background: "#ffecd9", ink: "#704224", accent: "#b36c36" },
  recrutement: { background: "#e2e9ff", ink: "#2c3e73", accent: "#5b71b1" },
  sport: { background: "#dcf2f4", ink: "#23535c", accent: "#368d98" },
  commerce: { background: "#ffe3eb", ink: "#76364c", accent: "#b75c7c" },
  environnement: { background: "#eaf0d8", ink: "#43532e", accent: "#798e46" },
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
  "linear-gradient(135deg, #f58529, #dd2a7b)",
  "linear-gradient(135deg, #515bd4, #8134af)",
  "linear-gradient(135deg, #00c6a7, #1e4d92)",
  "linear-gradient(135deg, #feda75, #fa7e1e)",
  "linear-gradient(135deg, #ee0979, #ff6a00)",
  "linear-gradient(135deg, #56ab2f, #a8e063)",
  "linear-gradient(135deg, #4f5bd5, #00c6ff)",
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
