// Clé de comparaison d'un nom de rue, utilisable dans le navigateur et sur le serveur :
// « rue Saint-Joseph Est », « Rue St-Joseph est » et « rue saint joseph est » donnent la même clé.
const ABBREVIATIONS: Record<string, string> = { st: "saint", ste: "sainte", bd: "boulevard", boul: "boulevard", av: "avenue", ave: "avenue", ch: "chemin" };

export function streetKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => ABBREVIATIONS[w] ?? w)
    .join(" ");
}
