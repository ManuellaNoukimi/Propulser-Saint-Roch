# Vérification qualité

Relevé du 21 octobre 2026. Exécution sur Windows. Première installation avec Node.js 24.19.0 et npm 11.20.0. Les commandes npm globales utilisent aussi le lanceur 11.17.0 associé au Node.js 26.12.0 de cet ordinateur, alors que Node.js 24 est placé en tête du PATH des scripts. Départ depuis une copie Git sans node_modules ni base. Les limites ci-dessous sont conservées, sans déclarer le prototype prêt pour la production.

## Commandes réellement exécutées

- [x] `npm ci --no-audit --no-fund` : 522 paquets installés depuis le verrouillage. Avertissements de dépendances dépréciées, installation terminée. Chargement du module SQLite natif vérifié séparément.
- [x] Copie de `.env.example` vers `.env.local` : configuration locale ignorée.
- [x] `npm run db:prepare` : schéma prêt et contrôle de clés étrangères sans erreur.
- [x] `npm run demo:seed`, exécuté deux fois : comptes et publications réutilisés, pas de double participation.
- [x] `npm test` : 32 tests métier réussis, aucun échec ni test ignoré. Besoins, zones, votes, import fictif SDC, plafonds, progression, confidentialité et persistance.
- [x] `npm run test:http` : trois scénarios réussis, F4, besoins des résidents et F6. Vérifications des sessions, permissions, validation, soutiens, occupation, confidentialité, parrainage, présence simulée et pages.
- [x] `npm run lint` : aucun échec. L'exception CommonJS est limitée aux fichiers .cjs de scripts/tests, les autres règles restent actives. L'application entière et les scripts sont contrôlés.
- [x] `npm run typecheck` : génération des types de routes et TypeScript sans erreur.
- [x] `npm run build` : compilation de production réussie, génération des pages terminée.
- [x] `npm start -- --port 3041 --hostname 127.0.0.1` : serveur de production démarré. 25 chemins contrôlés avec réponse HTTP 200 : 18 pages, quatre API publiques, manifeste et deux icônes. Le contrôle HTTP ne remplace pas l'essai interactif de tous les formulaires.
- [x] `npm run dev -- --port 3040 --hostname 127.0.0.1` : serveur de cette copie disponible, port distinct des projets existants.
- [x] Second clone Git sans node_modules ni base : `npm ci`, copie de l'environnement, `npm run demo:seed` puis `npm run dev -- --hostname 127.0.0.1` rejoués. Installation de 522 paquets annoncée en 2 minutes, serveur prêt en 6,4 secondes. Accueil HTTP 200 sur localhost:3000, trois activités, cinq locaux fictifs et connexion d'Alex confirmés. Le lanceur npm global a émis un avertissement de version Node 26 : sélectionner Node 24 LTS avant installation sur le poste du recruteur. La commande GitHub de clonage distant attend la publication de la branche et n'a pas été exécutée contre une branche inexistante.
- [x] `npm audit --json` : exécuté, code de sortie 1 et alertes détaillées ci-dessous. Ce contrôle n'est pas présenté comme réussi.
- [ ] Audit exhaustif de toutes les dépendances, du code et de l'infrastructure : hors de cette vérification.

## Parcours navigateur et contenu

- [x] Accueil : contenu chargé, chiffres du jeu fictif, lien d'évitement et un titre principal.
- [x] Connexion avec le résident fictif : champs identifiés, session établie et profil correspondant.
- [x] Navigation accueil, Vie à Saint-Roch, Vitrines et Mon profil observée. Les transitions asynchrones exigent d'attendre la nouvelle page avant d'enchaîner.
- [x] Vitrine : onglets, affichage d'un besoin, sélection de catégorie, formulaire désactivé sans zone, annulation, boutons de zoom.
- [x] Profil : score de 20 points issu des actions fictives, badge, historique privé et visibilité publique désactivée.
- [x] Captures réelles conservées dans `docs/screenshots/`, sans données du classeur confidentiel.
- [x] Profil contrôlé à 390 × 844 : aucun débordement horizontal mesuré, un h1, `lang=fr`, aucune image DOM cassée détectée.
- [x] Fil du quartier et mobilité contrôlés à 390 pixels : pas de débordement horizontal mesuré. Carte et stationnements affichés, suggestions de recherche observées pour « Bibliothèque » sans utiliser de position personnelle. Le calcul complet des quatre modes n'a pas été testé de bout en bout.
- [x] Navigation clavier : depuis « Modifier mon compte », Tab place le focus sur « Se déconnecter ». Les champs de connexion et du besoin ont des libellés utilisables.
- [x] Contraste principal observé : titre de mobilité `rgb(31,58,77)` sur fond blanc, ratio calculé 11,86:1. Ce contrôle ponctuel ne couvre pas tous les éléments.
- [x] Distinction dans le README entre fonctions disponibles, simulations et pages de présentation. La fiche « Signaler » et le menu restent historiquement incohérents, signalés sans réécriture fonctionnelle.
- [ ] Tous les parcours sur Safari, Firefox et téléphone physique : non exécutés.
- [ ] Audit WCAG complet, lecteur d'écran, tous les contrastes et toutes les commandes de carte au clavier : non exécutés.

## Alertes et erreurs restantes

### Dépendances

L'audit npm rapporte 8 paquets affectés : 1 critique, 5 élevés, 2 modérés. Ces nombres concernent des dépendances et chaînes de dépendances, pas huit incidents constatés dans l'application.

- MapLibre GL : alerte critique [GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579), liée à l'assainissement d'attributions HTML externes. La branche installée est 5.x et le correctif publié commence à 6.4.1. Une mise à niveau majeure et une vérification des cartes 3D sont nécessaires. Aucun correctif forcé risquant la compatibilité n'a été appliqué silencieusement.
- Chaîne ESLint : braces, micromatch, fast-glob, @next/eslint-plugin-next et eslint-config-next remontent une alerte de récursion dans les motifs. [Avis braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). npm propose un retour de version majeure non approprié pour corriger automatiquement la chaîne actuelle.
- ExcelJS et uuid : alerte modérée [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Ne pas interpréter les suggestions de rétrogradation majeure comme une correction automatiquement compatible.

Avant mise en ligne : traiter ces alertes dans un chantier de dépendances, renforcer l'authentification, vérifier sauvegarde/restauration, limiter les tentatives et imposer HTTPS. Les services et données de démonstration ne doivent pas recevoir de renseignements personnels.

### Console et ressources externes

Aucune erreur JavaScript n'a été observée dans les parcours accueil, connexion, Vitrine et profil. La carte charge, mais MapLibre avertit que certains pictogrammes du style externe sont manquants (`office`, `sports_centre`, `recycling`, `swimming_pool`, `gate`, `bicycle_parking`, `cycle_barrier`). Ils restent à corriger avec le fournisseur de style ou par un repli d'icône vérifié. Ce n'est pas masqué dans le code.

Next.js avertit qu'un verrouillage npm dans un dossier parent est ignoré. La compilation passe et l'application utilise son verrouillage propre. Aucun fichier parent de l'utilisateur n'a été modifié.

## Contrôles avant publication de la branche

- [x] `npm run check:repository` et `git diff --check` exécutés. Aucun fichier personnel ni motif de secret détecté. Recherche complémentaire sur 469 versions historiques de fichiers texte : aucun motif recherché détecté. Ce contrôle reste limité.
- [x] Liens Markdown locaux et images de la documentation : aucune cible manquante.
- [x] Commits séparés pour configuration, données fictives, documentation/captures et relevé qualité. État Git vérifié après finalisation.

Aucune fusion, pull request, licence collective, déploiement ou publication de branche n'est réalisé par cette préparation.
