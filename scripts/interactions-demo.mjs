// Fait interagir les comptes de démo (DEMO_COMPTES.md) par les VRAIES routes de l'app : complices sur les activités
// (participants, bénévoles, matériel, lieu, commandite, expertise), invitations (acceptées, refusées, en attente),
// messages entre commerces et organismes, votes et demandes sur les vitrines, besoins des résidents.
// Usage : node scripts/interactions-demo.mjs [http://localhost:3000]
// Sans danger si on le relance : les doublons sont refusés par l'app (409) et simplement ignorés.

const BASE = process.argv[2] || "http://localhost:3000";
const PASSWORD = "demo2026";
const stats = { ok: 0, deja: 0, refus: 0 };

async function call(path, method = "GET", body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? null };
}
function count(label, r) {
  if (r.status >= 200 && r.status < 300) stats.ok++;
  else if (r.status === 409) stats.deja++;
  else { stats.refus++; console.log(`   ✗ ${label} : ${r.status} ${r.data.error ?? ""}`); }
}

// ---------- Comptes ----------
const LOGINS = ["sophie", "marc", "amina", "julien", "nathalie", "cafe", "friperie", "studio", "entraide", "sdc"];
const A = {};
for (const name of LOGINS) {
  const r = await call("/api/auth/login", "POST", { email: `${name}@demo`, password: PASSWORD });
  if (!r.cookie) { console.log(`✗ connexion impossible : ${name}@demo (${r.status})`); continue; }
  A[name] = { cookie: r.cookie, id: r.data.user.id, name: r.data.user.displayName };
}
console.log(`${Object.keys(A).length} comptes connectés`);

// ---------- Activités ----------
const ideas = (await call("/api/ideas")).data.ideas ?? [];
const idea = (start) => ideas.find((i) => i.title.startsWith(start));

// [compte, début du titre de l'activité, contribution, message]
const COMPLICES = [
  ["marc", "Fête des 7 ans", "participer", "On vient avec mes deux gars !"],
  ["nathalie", "Fête des 7 ans", "materiel", "J'ai une tente pliante, je l'apporte."],
  ["amina", "Fête des 7 ans", "participer", ""],
  ["julien", "Fête des 7 ans", "participer", "Je passe après le travail."],
  ["cafe", "Fête des 7 ans", "commandite", "On offre le gâteau pour Léa 🎂"],
  ["entraide", "Fête des 7 ans", "materiel", "On peut prêter 4 tables et des chaises."],
  ["nathalie", "Vide-grenier", "benevole", "Je serai là à 8 h 30 pour les tables."],
  ["julien", "Vide-grenier", "benevole", ""],
  ["sophie", "Vide-grenier", "participer", "J'ai des vêtements d'enfants à vendre."],
  ["friperie", "Vide-grenier", "participer", "On prend un kiosque, on amène nos surplus."],
  ["amina", "Vide-grenier", "materiel", "Je prête deux tables pliantes."],
  ["sophie", "Échange de plantes", "participer", "J'apporte des boutures de pothos."],
  ["nathalie", "Échange de plantes", "participer", ""],
  ["marc", "Échange de plantes", "participer", ""],
  ["cafe", "Échange de plantes", "lieu", "Notre terrasse est libre en cas de pluie."],
  ["julien", "Groupe d'étude", "participer", ""],
  ["studio", "Groupe d'étude", "expertise", "Nos devs peuvent aider en programmation."],
  ["marc", "Pétanque du midi", "participer", ""],
  ["studio", "Pétanque du midi", "participer", "On vient à quatre de l'équipe."],
  ["cafe", "Pétanque du midi", "commandite", "Café offert aux joueurs."],
  ["marc", "Corvée de ramassage", "benevole", ""],
  ["amina", "Corvée de ramassage", "benevole", "J'amène deux amies."],
  ["entraide", "Corvée de ramassage", "materiel", "Sacs et gants pour 15 personnes."],
  ["friperie", "Corvée de ramassage", "benevole", ""],
  ["studio", "Corvée de ramassage", "benevole", "Notre équipe en fait son activité du vendredi."],
  ["julien", "Cherche 2 bras", "benevole", "J'ai une camionnette."],
  ["marc", "Cherche 2 bras", "benevole", ""],
  ["nathalie", "Soirée tricot", "participer", ""],
  ["sophie", "Soirée tricot", "participer", "Je débute, j'espère que vous êtes patients !"],
  ["amina", "Soirée tricot", "participer", ""],
  ["entraide", "Atelier « crée ton premier jeu", "expertise", "On amène des jeunes de notre maison des jeunes."],
  ["sophie", "Atelier « crée ton premier jeu", "participer", "Mon grand de 13 ans va adorer."],
  ["amina", "Atelier « crée ton premier jeu", "benevole", ""],
  ["cafe", "Bénévoles pour la soupe", "materiel", "On donne le pain du jour."],
  ["nathalie", "Bénévoles pour la soupe", "benevole", ""],
  ["marc", "Bénévoles pour la soupe", "benevole", ""],
  ["studio", "Bénévoles pour la soupe", "commandite", "On paie les légumes de la semaine."],
  ["friperie", "Collecte de manteaux", "lieu", "Point de dépôt à la friperie, rue Saint-Joseph."],
  ["sophie", "Collecte de manteaux", "participer", ""],
  ["julien", "Collecte de manteaux", "materiel", "Trois manteaux d'hiver en bon état."],
];
for (const [who, start, contribution, message] of COMPLICES) {
  const i = idea(start);
  if (!i || !A[who]) continue;
  count(`${who} → ${start}`, await call(`/api/ideas/${i.id}/complices`, "POST", { contribution, message }, A[who].cookie));
}
console.log(`complices : ${stats.ok} ajoutés, ${stats.deja} déjà là`);

// ---------- Invitations (organisateur → acteur) ----------
// [organisateur, activité, invité, contribution, raison, réponse : true / false / null = en attente]
const INVITES = [
  ["marc", "Vide-grenier", "entraide", "materiel", "Vous avez des tables à prêter ?", true],
  ["amina", "Échange de plantes", "friperie", "lieu", "Votre vitrine pour exposer les boutures ?", null],
  ["sophie", "Fête des 7 ans", "studio", "expertise", "Une petite animation jeux pour les enfants ?", null],
  ["julien", "Pétanque du midi", "entraide", "participer", "Une équipe de l'organisme pour un match amical ?", false],
  ["entraide", "Bénévoles pour la soupe", "friperie", "materiel", "Des tabliers ou des gants à donner ?", null],
  ["nathalie", "Corvée de ramassage", "cafe", "commandite", "Un café pour les bénévoles à la fin ?", true],
];
const before = { ...stats };
for (const [from, start, to, contribution, reason] of INVITES) {
  const i = idea(start);
  if (!i || !A[from] || !A[to]) continue;
  count(`invitation ${from} → ${to}`, await call("/api/invitations", "POST", { ideaId: i.id, invites: [{ userId: A[to].id, contribution, reason }] }, A[from].cookie));
}
for (const [, start, to, , , answer] of INVITES) {
  if (answer === null || !A[to]) continue;
  const received = (await call("/api/invitations", "GET", undefined, A[to].cookie)).data.received ?? [];
  const inv = received.find((x) => x.idea.title.startsWith(start) && x.status === "pending");
  if (inv) count(`réponse ${to}`, await call(`/api/invitations/${inv.id}`, "POST", { accept: answer }, A[to].cookie));
}
console.log(`invitations : ${stats.ok - before.ok} envoyées ou répondues`);

// ---------- Messages entre acteurs (« Contacter ») ----------
const MESSAGES = [
  ["cafe", "entraide", "Bonjour ! On a souvent des invendus en fin de journée : on peut les donner pour la soupe du samedi ?"],
  ["entraide", "cafe", "Avec plaisir, merci ! Passez au parvis vers 10 h 30 samedi, on vous présente l'équipe."],
  ["studio", "friperie", "Salut ! On organise un 5 à 7 d'équipe : ça vous dirait de faire un mini-défilé de vêtements seconde main ?"],
  ["friperie", "studio", "Super idée ! On a un portant mobile, on peut venir jeudi prochain."],
  ["sdc", "cafe", "Bienvenue sur Complices ! La SDC aimerait vous présenter le programme Vitrines et les rabais du Midi Complice."],
  ["studio", "entraide", "Nos développeurs aimeraient faire du bénévolat un vendredi par mois. Vous avez des besoins ?"],
  ["sdc", "friperie", "Un local vide juste à côté de vous attend un projet éphémère : intéressés par une boutique de manteaux ?"],
];
const m0 = stats.ok;
for (const [from, to, message] of MESSAGES) {
  if (A[from] && A[to]) count(`message ${from} → ${to}`, await call("/api/contacts", "POST", { toId: A[to].id, message }, A[from].cookie));
}
console.log(`messages : ${stats.ok - m0} envoyés`);

// ---------- Vitrines : votes « Ce que je veux ici » et demandes d'occupation ----------
const vacancies = (await call("/api/vacancies")).data.vacancies ?? [];
const onStreet = (street) => vacancies.filter((v) => v.street === street);
const sj = onStreet("rue Saint-Joseph Est");
const ch = onStreet("boulevard Charest Est");
const VOTES = [
  ["sophie", sj[0], "epicerie", 3], ["sophie", sj[1], "boulangerie", 2], ["sophie", ch[0], "pharmacie", 1],
  ["marc", sj[0], "epicerie", 2], ["marc", sj[2], "boucherie", 2],
  ["nathalie", sj[0], "epicerie", 3], ["nathalie", ch[0], "fruiterie", 2],
  ["amina", sj[1], "cafe", 3], ["amina", sj[3], "librairie", 1],
  ["julien", sj[2], "resto", 2], ["julien", ch[1], "cafe", 3],
];
const v0 = stats.ok;
for (const [who, local, wish, frequency] of VOTES) {
  if (A[who] && local) count(`vote ${who}`, await call(`/api/vacancies/${local.id}/votes`, "POST", { wish, frequency }, A[who].cookie));
}
const inDays = (d) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const BOOKINGS = [
  ["amina", sj[1], { project: "etudiant", title: "Expo des finissants en design", weeks: 2, startsOn: inDays(10) }],
  ["friperie", sj[2], { project: "boutique", title: "Boutique éphémère de manteaux d'hiver", weeks: 4, startsOn: inDays(14) }],
  ["sophie", ch[0], { project: "atelier", title: "Atelier bricolage parents-enfants", weeks: 1, startsOn: inDays(21) }],
];
for (const [who, local, body] of BOOKINGS) {
  if (A[who] && local) count(`demande ${who}`, await call(`/api/vacancies/${local.id}/bookings`, "POST", body, A[who].cookie));
}
console.log(`vitrines : ${stats.ok - v0} votes et demandes`);

// ---------- Besoins des résidents (onglet « Besoins des résidents ») ----------
const PARVIS = { lat: 46.8137, lng: -71.2253 };
const JARDIN = { lat: 46.8124, lng: -71.2288 };
const BIBLIO = { lat: 46.8141, lng: -71.2246 };
const n0 = stats.ok;
const needs = [
  ["sophie", { category: "epicerie", frequency: 3, ...PARVIS, radiusMeters: 400 }, ["marc", "nathalie", "julien"]],
  ["nathalie", { category: "garderie", frequency: 2, ...JARDIN, radiusMeters: 500 }, ["sophie"]],
  ["amina", { category: "librairie", frequency: 1, ...BIBLIO, radiusMeters: 300 }, ["marc"]],
];
for (const [who, body, supporters] of needs) {
  if (!A[who]) continue;
  const r = await call("/api/resident-needs", "POST", body, A[who].cookie);
  count(`besoin ${who}`, r);
  const id = r.data.id;
  if (!id) continue;
  for (const s of supporters) if (A[s]) count(`soutien ${s}`, await call(`/api/resident-needs/${id}/support`, "PUT", { frequency: 2 }, A[s].cookie));
}
console.log(`besoins des résidents : ${stats.ok - n0} besoins et soutiens`);

console.log(`\nTotal : ${stats.ok} actions faites, ${stats.deja} déjà faites avant, ${stats.refus} refusées par l'app.`);
