// Ajoute d'autres activités dans « Vie Saint-Roch », publiées par les comptes de démo (DEMO_COMPTES.md),
// avec des complices, par les vraies routes de l'app. Lieux publics réels, personnes et commerces fictifs.
// Usage : node scripts/activites-plus.mjs [http://localhost:3000]
// Relançable : une activité au même titre déjà publiée par le même compte est sautée.

const BASE = process.argv[2] || "http://localhost:3000";
const PASSWORD = "demo2026";
const at = (month, day, hour, minute = 0) => `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-04:00`;

// [compte, titre, catégorie, lieu, date, besoins, description, complices : [compte, contribution, message][]]
const ACTIVITIES = [
  ["amina", "Séance d'étude ouverte à la bibliothèque", "communautaire", "Bibliothèque Gabrielle-Roy", at(10, 16, 14), ["participants"],
    "Viens étudier en groupe cet après-midi, tous les programmes sont bienvenus. Pause café à 15 h 30.",
    [["julien", "participer", ""], ["sophie", "participer", "J'apporte mon ordi, je fais ma compta !"]]],
  ["cafe", "Dégustation de cafés du monde", "commerce", "Café La Petite Pause, rue Saint-Joseph Est", at(10, 18, 15), ["participants"],
    "Éthiopie, Colombie, Guatemala : on goûte trois cafés et on parle torréfaction. Gratuit, places limitées.",
    [["nathalie", "participer", ""], ["marc", "participer", ""], ["amina", "participer", ""]]],
  ["marc", "Atelier réparation de vélos entre voisins", "communautaire", "Parvis de l'église Saint-Roch", at(10, 19, 13), ["materiel", "expertise"],
    "Apporte ton vélo : on change les chambres à air, on règle les freins et on graisse les chaînes avant l'hiver.",
    [["julien", "expertise", "Je répare des vélos depuis 10 ans."], ["entraide", "materiel", "On prête un pied d'atelier et des outils."], ["sophie", "participer", ""]]],
  ["sophie", "Pique-nique d'automne au parc Victoria", "communautaire", "Parc Victoria", at(10, 19, 12), ["participants"],
    "Chacun apporte un plat à partager. Couvertures, jeux pour les enfants et chocolat chaud.",
    [["nathalie", "participer", "J'apporte une tarte aux pommes."], ["marc", "participer", ""], ["cafe", "commandite", "On offre le chocolat chaud."]]],
  ["marc", "Jardin d'automne : on prépare les bacs pour l'hiver", "environnement", "Jardin Jean-Paul-L'Allier", at(10, 20, 10), ["benevoles", "materiel"],
    "On vide les bacs, on paille et on plante l'ail pour l'an prochain. Gants fournis.",
    [["nathalie", "benevole", ""], ["amina", "benevole", ""], ["studio", "benevole", "Deux personnes de l'équipe."]]],
  ["julien", "Course matinale de 5 km avant le bureau", "sport", "Jardin Jean-Paul-L'Allier", at(10, 21, 7), ["participants"],
    "Départ 7 h, rythme tranquille, retour 7 h 45. Tous niveaux.",
    [["marc", "participer", ""], ["studio", "participer", "On vient à trois."]]],
  ["entraide", "Cuisine collective du mercredi", "communautaire", "Bibliothèque Gabrielle-Roy", at(10, 22, 10), ["benevoles", "materiel"],
    "On cuisine ensemble des repas pour la semaine, à petit prix. Il manque des bras et des grandes casseroles.",
    [["nathalie", "benevole", ""], ["cafe", "materiel", "On prête deux grandes casseroles."], ["sophie", "benevole", ""]]],
  ["studio", "Portes ouvertes : découvrir les métiers du jeu vidéo", "recrutement", "Boulevard Charest Est", at(10, 22, 17), ["participants"],
    "Programmation, art, son : nos équipes présentent leurs métiers. Pour étudiant·e·s et curieux.",
    [["amina", "participer", "Super pour mon cours !"], ["julien", "participer", ""]]],
  ["amina", "Club de lecture au café", "culturel", "Café La Petite Pause, rue Saint-Joseph Est", at(10, 23, 19), ["participants"],
    "Ce mois-ci : un roman québécois au choix. On se retrouve pour en parler autour d'un thé.",
    [["nathalie", "participer", ""], ["sophie", "participer", ""], ["cafe", "lieu", "La salle du fond est à vous."]]],
  ["julien", "Tournoi de jeux de société", "culturel", "Café La Petite Pause, rue Saint-Joseph Est", at(10, 24, 19), ["participants", "materiel"],
    "Catan, Dixit, Codenames : viens seul·e ou en équipe, on forme les tables sur place.",
    [["marc", "participer", ""], ["studio", "materiel", "On apporte notre ludothèque."], ["amina", "participer", ""]]],
  ["sophie", "Heure du conte pour les tout-petits", "culturel", "Bibliothèque Gabrielle-Roy", at(10, 25, 10), ["participants", "benevoles"],
    "Histoires et comptines pour les 2 à 5 ans, suivies d'un bricolage.",
    [["nathalie", "benevole", "Je lis volontiers une histoire."], ["entraide", "participer", ""]]],
  ["friperie", "Défilé de mode seconde main", "culturel", "Parvis de l'église Saint-Roch", at(10, 25, 16), ["participants", "benevoles"],
    "Les voisins défilent avec des tenues de la friperie. Musique, prix de présence et vente à petit prix.",
    [["sophie", "participer", ""], ["amina", "benevole", "Je peux aider au maquillage."], ["studio", "commandite", "On paie la sono."]]],
  ["nathalie", "Tricot-don : des bonnets pour l'hiver", "benevolat", "Bibliothèque Gabrielle-Roy", at(10, 26, 14), ["benevoles", "materiel"],
    "On tricote des bonnets et des mitaines remis à Entraide Basse-Ville. Laine fournie, débutant·e·s bienvenu·e·s.",
    [["sophie", "benevole", ""], ["friperie", "materiel", "On donne des pelotes de laine."], ["entraide", "participer", "Merci, on les distribue la semaine suivante !"]]],
  ["sdc", "Grande corvée des vitrines de la rue Saint-Joseph", "environnement", "Rue Saint-Joseph Est", at(10, 26, 10), ["benevoles", "materiel"],
    "On nettoie et on décore les vitrines vides de la rue avec les commerçants. Seaux, raclettes et café fournis.",
    [["friperie", "benevole", ""], ["cafe", "commandite", "Café et viennoiseries pour tout le monde."], ["marc", "benevole", ""], ["julien", "benevole", ""]]],
  ["entraide", "Halloween des familles", "communautaire", "Parvis de l'église Saint-Roch", at(10, 31, 17), ["benevoles", "materiel", "participants"],
    "Parcours de bonbons chez les commerçants, maquillage et maison hantée sur le parvis.",
    [["cafe", "materiel", "On distribue des bonbons au comptoir."], ["friperie", "materiel", "Des costumes à prêter."], ["sophie", "participer", "Léa sera en sorcière !"], ["nathalie", "benevole", ""]]],
];

async function call(path, method = "GET", body, cookie) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})), cookie: res.headers.get("set-cookie")?.split(";")[0] ?? null };
}

const A = {};
for (const name of ["sophie", "marc", "amina", "julien", "nathalie", "cafe", "friperie", "studio", "entraide", "sdc"]) {
  const r = await call("/api/auth/login", "POST", { email: `${name}@demo`, password: PASSWORD });
  if (r.cookie) A[name] = { cookie: r.cookie, id: r.data.user.id };
}
const existing = (await call("/api/ideas")).data.ideas ?? [];
let created = 0, joined = 0, skipped = 0;
for (const [who, title, category, place, startsAt, needs, description, complices] of ACTIVITIES) {
  if (!A[who]) continue;
  let idea = existing.find((i) => i.title === title && i.organizer.id === A[who].id);
  if (idea) skipped++;
  else {
    const r = await call("/api/ideas", "POST", { title, description, category, place, startsAt, needs }, A[who].cookie);
    if (r.status !== 201) { console.log(`✗ ${title} : ${r.status} ${r.data.error ?? ""}`); continue; }
    idea = { id: r.data.id };
    created++;
  }
  for (const [c, contribution, message] of complices) {
    if (!A[c]) continue;
    const r = await call(`/api/ideas/${idea.id}/complices`, "POST", { contribution, message }, A[c].cookie);
    if (r.status === 201) joined++;
  }
}
console.log(`${created} activités ajoutées (${skipped} déjà là), ${joined} complices.`);
