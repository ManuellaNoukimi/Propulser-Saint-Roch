// Publie de VRAIES activités « en cours » dans Vie Saint-Roch, par les comptes de démo (DEMO_COMPTES.md),
// en passant par les routes de l'app (connexion, envoi de photo, publication, « je me propose »). Demande de Danny, 16 oct. :
// « En direct » doit être rempli pendant la présentation, avec les comptes qu'on a, sans rien écrire en dur dans l'app,
// et chaque activité a SA photo (aucune en double ; photos libres de droits, crédits dans scripts/photos-direct/CREDITS.md).
// Les heures de début sont calculées à partir du moment où on lance le script, étalées pour couvrir les heures qui suivent
// (une activité de l'app est « en direct » pendant 2 h après son début). Lieux publics réels, personnes et commerces fictifs.
// Usage : node scripts/activites-direct.mjs [http://localhost:3000]
// Relançable : une activité au même titre, avec photo, déjà publiée par le même compte est sautée.
// Les activités de la 1re version (sans photo) sont masquées par leur auteur, puis republiées avec une photo.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "http://localhost:3000";
const PASSWORD = "demo2026";
const PHOTOS = path.join(path.dirname(fileURLToPath(import.meta.url)), "photos-direct");
const QUARTER = 15 * 60_000;
const base = Math.floor(Date.now() / QUARTER) * QUARTER;
const fromNow = (minutes) => new Date(base + minutes * 60_000).toISOString();

// [compte, titre, catégorie, lieu, début (minutes après maintenant), photo, besoins, description, complices : [compte, contribution, message][]]
const ACTIVITIES = [
  ["marc", "Clinique vélo à ciel ouvert", "benevolat", "Jardin Jean-Paul-L'Allier", -45, "sport.jpg", ["benevoles", "materiel"],
    "Apporte ton vélo : on regonfle, on règle les freins et on graisse les chaînes, gratuitement. Outils sur place.",
    [["julien", "expertise", "Je m'occupe des freins."], ["entraide", "materiel", "On prête deux pieds d'atelier."], ["sophie", "participer", ""]]],
  ["amina", "L'heure du conte pour les tout-petits", "culturel", "Bibliothèque Gabrielle-Roy", -30, "lecture.jpg", ["benevoles"],
    "Des histoires lues à voix haute pour les 2 à 6 ans, puis un petit bricolage. Les parents restent avec nous.",
    [["sophie", "participer", "On vient avec Léa !"], ["nathalie", "benevole", "Je lis une histoire."]]],
  ["entraide", "Marché de quartier : fruits et légumes à petit prix", "commerce", "Parvis de l'église Saint-Roch", -15, "marche.jpg", ["benevoles"],
    "Des producteurs de la région sur le parvis. Paniers à prix solidaires, on accepte toutes les cartes.",
    [["nathalie", "benevole", "Je tiens la caisse une heure."], ["cafe", "commandite", "Café offert aux bénévoles."], ["amina", "participer", ""]]],
  ["nathalie", "Corvée d'automne au jardin communautaire", "environnement", "Parc des Pékans", 45, "jardin.jpg", ["benevoles", "materiel"],
    "On vide les bacs, on paille et on plante l'ail pour l'an prochain. Gants et outils fournis.",
    [["marc", "benevole", ""], ["amina", "benevole", ""], ["studio", "benevole", "Deux personnes de l'équipe."]]],
  ["studio", "Café-rencontre des travailleurs du quartier", "communautaire", "Boulevard Charest Est", 105, "tech.jpg", ["participants"],
    "Tu travailles dans Saint-Roch ? Viens rencontrer les gens des bureaux et des commerces voisins, café offert.",
    [["julien", "participer", "J'amène mes collègues."], ["cafe", "commandite", "Le café, c'est nous."]]],
  ["sophie", "Jeux de société en famille au parc", "sport", "Parc Victoria", 135, "jeux.jpg", ["participants", "materiel"],
    "On sort les jeux sur les tables à pique-nique. Petits et grands bienvenus, apporte ton jeu préféré.",
    [["marc", "participer", ""], ["studio", "materiel", "On apporte une dizaine de jeux."], ["julien", "participer", ""]]],
  ["nathalie", "Atelier de dessin en plein air", "culturel", "Carré Lépine", 150, "art.jpg", ["participants"],
    "Croquis du quartier en groupe : carnets et crayons fournis, aucune expérience nécessaire.",
    [["amina", "participer", ""], ["studio", "expertise", "Une de nos artistes donne des trucs."], ["sophie", "participer", ""]]],
  ["marc", "Atelier menuiserie : fabrique ton nichoir", "benevolat", "Parvis de l'église Saint-Roch", 165, "atelier.jpg", ["expertise", "materiel"],
    "On fabrique des nichoirs pour les oiseaux du quartier. Planches prédécoupées et outils sur place.",
    [["julien", "participer", ""], ["entraide", "materiel", "On fournit les planches."], ["amina", "participer", ""]]],
  ["cafe", "Dégustation de bouchées du quartier", "commerce", "Café La Petite Pause, rue Saint-Joseph Est", 180, "repas.jpg", ["participants"],
    "Les restos de la rue font goûter leurs plats en petites portions. Gratuit, en terrasse chauffée.",
    [["julien", "participer", ""], ["marc", "participer", ""], ["nathalie", "participer", ""]]],
  ["entraide", "Fête de quartier en musique", "communautaire", "Place de l'Université-du-Québec", 195, "fete.jpg", ["benevoles", "participants"],
    "Musique, jeux pour les enfants et chocolat chaud : on se retrouve entre voisins pour fêter l'automne.",
    [["sophie", "participer", ""], ["studio", "benevole", "On s'occupe du son."], ["cafe", "commandite", "Chocolat chaud offert."], ["amina", "participer", ""]]],
  // 3e lot (16 oct., ~12 h 45, « mets plus d'activités en direct ») : photographies par sujet
  ["friperie", "Défilé de mode seconde main", "commerce", "Rue Saint-Joseph Est", -60, "mode-photo.jpg", ["participants", "benevoles"],
    "Des voisins défilent avec des tenues de la friperie, puis tout est en vente à petit prix. Viens comme spectateur ou mannequin !",
    [["amina", "participer", "Je défile !"], ["sophie", "participer", ""], ["cafe", "commandite", "Limonade offerte."]]],
  ["julien", "Jam de musique en plein air", "culturel", "Parc de la Pointe-aux-Lièvres", -45, "musique-photo.jpg", ["participants", "materiel"],
    "Guitares, percussions, voix : on joue ensemble, tous niveaux. Apporte ton instrument, on prête des tambourins.",
    [["marc", "participer", "J'apporte ma guitare."], ["studio", "materiel", "On prête un petit ampli."], ["nathalie", "participer", ""]]],
  ["marc", "Balade à vélo dans le quartier", "sport", "Marina Saint-Roch", -30, "velo-photo.jpg", ["participants"],
    "Une boucle tranquille de 8 km le long de la rivière Saint-Charles, avec arrêts. Casque conseillé.",
    [["julien", "participer", ""], ["sophie", "participer", "On vient en famille."]]],
  ["studio", "Pause active du midi : yoga sur l'herbe", "sport", "Jardin Jean-Paul-L'Allier", -15, "yoga-photo.jpg", ["participants"],
    "30 minutes d'étirements et de respiration pour les travailleurs du quartier. Tapis prêtés, aucune expérience nécessaire.",
    [["julien", "participer", "Parfait pour ma pause."], ["amina", "participer", ""], ["cafe", "commandite", "Thé offert après."]]],
  ["entraide", "Soupe solidaire du midi", "benevolat", "Parvis de l'église Saint-Roch", 0, "repas-photo.jpg", ["benevoles", "materiel"],
    "Une soupe chaude offerte à tout le monde sur le parvis. On cherche des bras pour servir et des bols.",
    [["nathalie", "benevole", "Je sers une heure."], ["cafe", "materiel", "On prête des bols."], ["marc", "benevole", ""]]],
  ["amina", "Échange de livres entre voisins", "culturel", "Bibliothèque Gabrielle-Roy", 30, "lecture-photo.jpg", ["participants"],
    "Apporte un livre que tu as aimé, repars avec un autre. Romans, BD, livres pour enfants : tout est bienvenu.",
    [["sophie", "participer", "J'apporte des livres jeunesse."], ["nathalie", "participer", ""], ["julien", "participer", ""]]],
  ["nathalie", "Plantation de bulbes au parc", "environnement", "Parc Victoria", 60, "jardin-photo.jpg", ["benevoles", "materiel"],
    "On plante des tulipes et des crocus pour le printemps. Bulbes, gants et pelles fournis.",
    [["marc", "benevole", ""], ["entraide", "materiel", "On fournit les bulbes."], ["amina", "benevole", ""]]],
];

// 1re version (sans photo) : retirée par son auteur avant de republier avec une photo.
const FIRST_VERSION = [
  ["marc", "Clinique vélo à ciel ouvert"], ["entraide", "Marché de quartier : fruits et légumes à petit prix"],
  ["amina", "Tricot-café entre voisins"], ["sophie", "Jeux de société en famille au parc"], ["nathalie", "Atelier de dessin en plein air"],
  ["cafe", "Dégustation de cafés sur la terrasse"], ["studio", "Portes ouvertes : viens essayer nos jeux"],
];

async function call(urlPath, method = "GET", body, cookie) {
  const res = await fetch(`${BASE}${urlPath}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})), cookie: res.headers.get("set-cookie")?.split(";")[0] ?? null };
}

async function upload(file, cookie) {
  const form = new FormData();
  const type = file.endsWith(".png") ? "image/png" : "image/jpeg";
  form.append("file", new Blob([await readFile(path.join(PHOTOS, file))], { type }), file);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", headers: { Cookie: cookie }, body: form });
  const data = await res.json().catch(() => ({}));
  return res.status === 201 ? data.url : null;
}

const A = {};
for (const name of ["sophie", "marc", "amina", "julien", "nathalie", "cafe", "friperie", "studio", "entraide"]) {
  const r = await call("/api/auth/login", "POST", { email: `${name}@demo`, password: PASSWORD });
  if (r.cookie) A[name] = { cookie: r.cookie, id: r.data.user.id };
  else console.log(`✗ connexion ${name}@demo : ${r.status} ${r.data.error ?? ""}`);
}
let existing = (await call("/api/ideas")).data.ideas ?? [];

let hidden = 0;
for (const [who, title] of FIRST_VERSION) {
  if (!A[who]) continue;
  for (const idea of existing.filter((i) => i.title === title && i.organizer.id === A[who].id && i.images.length === 0)) {
    const r = await call(`/api/ideas/${idea.id}`, "PATCH", { hidden: true }, A[who].cookie);
    if (r.status === 200) hidden++;
  }
}
if (hidden) existing = (await call("/api/ideas")).data.ideas ?? [];

let created = 0, joined = 0, skipped = 0;
for (const [who, title, category, place, minutes, photo, needs, description, complices] of ACTIVITIES) {
  if (!A[who]) continue;
  const startsAt = fromNow(minutes);
  let idea = existing.find((i) => i.title === title && i.organizer.id === A[who].id && i.images.length > 0);
  if (idea) skipped++;
  else {
    const url = await upload(photo, A[who].cookie);
    if (!url) { console.log(`✗ photo ${photo} pour « ${title} »`); continue; }
    const r = await call("/api/ideas", "POST", { title, description, category, place, startsAt, needs, images: [url] }, A[who].cookie);
    if (r.status !== 201) { console.log(`✗ ${title} : ${r.status} ${r.data.error ?? ""}`); continue; }
    idea = { id: r.data.id };
    created++;
    console.log(`✓ ${new Date(startsAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}  ${title} (${who}, ${photo})`);
  }
  for (const [c, contribution, message] of complices) {
    if (!A[c]) continue;
    const r = await call(`/api/ideas/${idea.id}/complices`, "POST", { contribution, message }, A[c].cookie);
    if (r.status === 201) joined++;
  }
}
console.log(`${created} activités en direct ajoutées (${skipped} déjà là), ${joined} complices, ${hidden} ancienne(s) version(s) sans photo retirée(s).`);
