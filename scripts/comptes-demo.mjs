// Crée de VRAIS comptes de démo dans l'app qui tourne, en passant par ses routes (inscription, publication),
// puis publie des activités et des annonces ordinaires du quartier. Personnes et commerces FICTIFS, lieux publics.
// Usage : node scripts/comptes-demo.mjs [http://localhost:3000]
// Sans risque si on le relance : un compte qui existe déjà est sauté (pas de publication en double).
// Les identifiants sont listés dans DEMO_COMPTES.md.

const BASE = process.argv[2] || "http://localhost:3000";
const PASSWORD = "demo2026";

// Heure de Québec (octobre = UTC-4) : `jour` = 2026-10-JJ
const at = (day, hour, minute = 0) => `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-04:00`;

const ACCOUNTS = [
  {
    email: "sophie@demo", displayName: "Sophie Tremblay", accountType: "habitant", description: "Maman de Léa, dans le quartier depuis 8 ans.",
    ideas: [
      { title: "Fête des 7 ans de ma fille Léa au parc Victoria", category: "communautaire", place: "Parc Victoria", startsAt: at(18, 13), needs: ["participants", "materiel"],
        description: "On fête Léa au parc ! Les enfants du quartier sont les bienvenus. Si quelqu'un a des tables pliantes ou une tente, ce serait super. Gâteau pour tout le monde 🎂" },
    ],
  },
  {
    email: "marc@demo", displayName: "Marc-André Gagnon", accountType: "habitant", description: "Voisin de la rue Saint-Vallier.",
    ideas: [
      { title: "Vide-grenier de la rue : besoin d'aide pour installer les tables", category: "communautaire", place: "Rue Saint-Vallier Est", startsAt: at(17, 8, 30), needs: ["benevoles", "materiel"],
        description: "Une dizaine de voisins vident leur sous-sol samedi. Il nous faut 3-4 personnes pour monter les tables à 8 h 30 et quelques tables de plus. Café offert aux bénévoles !" },
    ],
  },
  {
    email: "amina@demo", displayName: "Camille Bergeron", accountType: "etudiant", description: "Étudiante à l'ENAP, j'habite Saint-Roch.",
    ideas: [
      { title: "Échange de plantes et de boutures", category: "environnement", place: "Jardin Jean-Paul-L'Allier", startsAt: at(19, 14), needs: ["participants"],
        description: "Apporte une bouture ou une plante dont tu veux te débarrasser, repars avec une autre. Pothos, monstera, fines herbes… tout est bienvenu 🌱" },
      { title: "Groupe d'étude du jeudi soir", category: "communautaire", place: "Bibliothèque Gabrielle-Roy", startsAt: at(22, 18), needs: ["participants"],
        description: "On étudie ensemble, chacun sur ses affaires, avec une pause café. Tous les programmes, toutes les écoles." },
    ],
  },
  {
    email: "julien@demo", displayName: "Julien Roy", accountType: "travailleur", description: "Je travaille sur Charest, toujours partant pour une pause dehors.",
    ideas: [
      { title: "Pétanque du midi sur le parvis", category: "sport", place: "Parvis de l'église Saint-Roch", startsAt: at(16, 12, 5), needs: ["participants"],
        description: "30 minutes de pétanque pendant la pause du dîner. J'apporte les boules, viens comme tu es, débutants bienvenus." },
    ],
  },
  {
    email: "nathalie@demo", displayName: "Nathalie Bouchard", accountType: "habitant", description: "Retraitée, bénévole un peu partout.",
    ideas: [
      { title: "Corvée de ramassage de feuilles et de déchets", category: "environnement", place: "Parc des Pékans", startsAt: at(18, 10), needs: ["benevoles", "materiel"],
        description: "Une heure pour rendre le parc plus beau avant l'hiver. Il manque des râteaux et des gants : si tu en as, apporte-les !" },
      { title: "Cherche 2 bras pour un déménagement de quartier", category: "benevolat", place: "Rue de la Couronne", startsAt: at(24, 9), needs: ["benevoles"],
        description: "Ma voisine de 82 ans déménage deux rues plus loin. Quelques boîtes et un petit meuble. Pizza pour remercier 🍕" },
    ],
  },
  {
    email: "cafe@demo", displayName: "Café La Petite Pause", accountType: "commerce", sector: "cafe", address: "Rue Saint-Joseph Est", description: "Café de quartier (commerce fictif pour la démo).",
    ideas: [
      { title: "Soirée tricot et jeux de société", category: "culturel", place: "Café La Petite Pause, rue Saint-Joseph Est", startsAt: at(21, 19), needs: ["participants"],
        description: "Apporte ton tricot ou ton jeu préféré. On garde la salle ouverte jusqu'à 22 h, chocolat chaud à prix doux." },
    ],
    posts: [
      { postType: "promo", title: "2e café à moitié prix l'après-midi", description: "Du lundi au vendredi, de 14 h à 16 h. Parfait pour une pause entre deux réunions." },
    ],
  },
  {
    email: "friperie@demo", displayName: "Friperie Le Grenier", accountType: "commerce", sector: "boutique", address: "Rue Saint-Joseph Est", description: "Friperie (commerce fictif pour la démo).",
    posts: [
      { postType: "nouveaute", title: "Arrivage de manteaux d'hiver", description: "Plus de 60 manteaux, tuques et mitaines dès samedi 10 h. Tailles enfants aussi." },
      { postType: "emploi", title: "On cherche un·e vendeur·euse à temps partiel", description: "Fins de semaine, ambiance relax, rabais employé. Passe nous voir avec ton CV." },
    ],
  },
  {
    email: "studio@demo", displayName: "Studio Pixel Basse-Ville", accountType: "entreprise", sector: "tech", address: "Boulevard Charest Est", description: "Studio de jeux vidéo (entreprise fictive pour la démo).",
    ideas: [
      { title: "Atelier « crée ton premier jeu vidéo » pour les 12-17 ans", category: "culturel", place: "Bibliothèque Gabrielle-Roy", startsAt: at(24, 13), needs: ["participants", "benevoles"],
        description: "Nos développeurs montrent aux ados comment faire un petit jeu en 2 heures. Gratuit, ordinateurs fournis." },
    ],
    posts: [
      { postType: "offre", title: "Notre salle de réunion prêtée aux organismes le vendredi", description: "20 places, écran et café. Les organismes du quartier peuvent la réserver gratuitement." },
    ],
  },
  {
    email: "entraide@demo", displayName: "Entraide Basse-Ville", accountType: "organisme", sector: "culture", address: "Saint-Roch", description: "Organisme communautaire (fictif pour la démo).",
    ideas: [
      { title: "Bénévoles pour la soupe du samedi", category: "benevolat", place: "Parvis de l'église Saint-Roch", startsAt: at(17, 11), needs: ["benevoles"],
        description: "On sert une soupe chaude à tous ceux qui en ont besoin. Il nous faut des mains pour servir et ranger, de 11 h à 13 h." },
      { title: "Collecte de manteaux et de bottes pour l'hiver", category: "communautaire", place: "Bibliothèque Gabrielle-Roy", startsAt: at(20, 16), needs: ["materiel", "benevoles"],
        description: "Dépose tes manteaux, bottes, tuques propres. On les redonne dans le quartier la semaine suivante." },
    ],
  },
];

async function call(path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.get("set-cookie");
  return { status: res.status, data, cookie: setCookie ? setCookie.split(";")[0] : null };
}

let created = 0;
let published = 0;
for (const a of ACCOUNTS) {
  const { ideas = [], posts = [], ...profile } = a;
  const signup = await call("/api/auth/signup", { ...profile, password: PASSWORD });
  if (signup.status === 409) {
    console.log(`= ${a.displayName} existe déjà (${a.email}) : rien de publié`);
    continue;
  }
  if (signup.status !== 201 || !signup.cookie) {
    console.log(`✗ ${a.displayName} : ${signup.status} ${signup.data.error ?? ""}`);
    continue;
  }
  created++;
  console.log(`+ ${a.displayName} (${a.email})`);
  for (const idea of ideas) {
    const r = await call("/api/ideas", idea, signup.cookie);
    console.log(`   ${r.status === 201 ? "✓" : "✗"} activité : ${idea.title}${r.status === 201 ? "" : ` (${r.status} ${r.data.error ?? ""})`}`);
    if (r.status === 201) published++;
  }
  for (const post of posts) {
    const r = await call("/api/entreprises", post, signup.cookie);
    console.log(`   ${r.status === 201 ? "✓" : "✗"} annonce : ${post.title}${r.status === 201 ? "" : ` (${r.status} ${r.data.error ?? ""})`}`);
    if (r.status === 201) published++;
  }
}
console.log(`\n${created} compte(s) créé(s), ${published} publication(s). Mot de passe de tous les comptes : voir DEMO_COMPTES.md`);
