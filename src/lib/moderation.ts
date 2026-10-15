// Filtre local des propos haineux et injurieux (aucun service externe).
// Normalise le texte (minuscules, sans accents, leetspeak) puis cherche des mots ou expressions interdits.

const BLOCKED_WORDS = [
  // insultes courantes (FR / QC)
  // (on évite les mots ambigus du français courant : « retard », « raton laveur », « barbecue mongol »…)
  "connard", "connasse", "salope", "salaud", "encule", "enculer", "batard", "pute", "putain de",
  "fdp", "ntm", "niquer", "nique ta", "tapette", "tarlouze", "gouine", "debile mental",
  "abruti", "cretin", "imbecile", "mange de la marde", "ta gueule", "ferme ta gueule",
  // haine envers des groupes
  "negre", "negro", "bougnoule", "bicot", "youpin", "chinetoque", "niakoue",
  "sale arabe", "sale noir", "sale juif", "sale musulman", "sale immigre", "sale itinerant",
  "sale quebecois", "sale francais", "sale anglais", "sale autochtone", "sales itinerants", "sales immigres",
  "les itinerants dehors", "mort aux", "a mort les", "il faut tuer", "faut les tuer", "gazer les",
  "race inferieure", "retourne dans ton pays", "heil hitler", "sieg heil",
  // anglais
  "fuck you", "motherfucker", "bitch", "faggot", "nigger", "nigga", "kill yourself", "kys",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "€": "e" };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$€]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, " ")
    .replace(/(.)\1{2,}/g, "$1$1") // « connnnard » → « connard »
    .replace(/\s+/g, " ")
    .trim();
}

// Accepte aussi les pluriels et féminins simples (« connards », « salauds »…)
const PATTERNS = BLOCKED_WORDS.map(
  (w) => new RegExp(`(^|\\s)${normalize(w).replace(/\s+/g, "\\s+")}(?:s|x|e|es)?(\\s|$)`),
);

// « f*ck », « c*nnard » : on essaie de remplacer les astérisques par chaque voyelle
function variants(text: string): string[] {
  if (!text.includes("*")) return [text];
  return [text, ..."aeiou".split("").map((v) => text.replace(/\*/g, v))];
}

export type ModerationResult = { ok: true } | { ok: false; reason: string };

export function moderate(...texts: (string | null | undefined)[]): ModerationResult {
  for (const t of texts) {
    if (!t) continue;
    const hit = variants(t).some((v) => {
      const n = ` ${normalize(v)} `;
      return PATTERNS.some((p) => p.test(n));
    });
    if (hit) {
      return {
        ok: false,
        reason: "Ton texte contient des propos haineux ou injurieux. Complices est un espace bienveillant : reformule ton message, s'il te plaît.",
      };
    }
  }
  return { ok: true };
}
