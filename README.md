# Complice

Le point de rencontre numérique de Saint-Roch : découvrir une initiative, participer et exprimer les besoins de son quartier.

![Accueil réel de Complice avec les données fictives de la démonstration locale](docs/screenshots/accueil.jpg)

Prototype d'équipe réalisé au **Hackathon de Québec International, octobre 2026**. L'interface emploie aussi le nom « Complices ». Aucune démonstration publique n'est déployée. [Voir les captures réelles](docs/screenshots/README.md) ou lancer l'application localement.

## Le problème

Résidents, commerces, entreprises et organismes partagent un quartier, mais leurs initiatives et leurs besoins restent dispersés. Une idée peut manquer de partenaires simplement parce qu'ils ne se trouvent pas.

## La solution

Complice rapproche découverte, participation, mobilité et expression des besoins dans un même parcours. Le prototype permet de tester ces interactions avec des données fictives. Il ne prétend pas démontrer un impact social déjà mesuré.

## Fonctionnalités disponibles

- **Vie du quartier** : fil d'initiatives, recherche, filtres, détail et participation comme complice.
- **Vitrine** : besoins sur une zone personnalisée de Saint-Roch, soutiens, locaux vacants fictifs, votes et demandes d'occupation. Les localisations non confirmées restent signalées.
- **Profil résident** : points, niveaux, badges et historique privé. L'aide confirmée et la participation alimentent la progression. Le check-in et le Midi incluent des simulations identifiées.
- **Entreprises** : publications, invitations, contacts et tableau de bord. L'annuaire accepte les comptes locaux et des fichiers externes facultatifs.
- **Mobilité** : carte, recherche de lieux et propositions auto, marche, vélo et bus. Les services publics et le réseau conditionnent une partie des résultats. Les horaires RTC viennent d'un instantané, pas d'un suivi GPS. Les stationnements affichés ne garantissent pas une place libre.
- **Signalements** : page `/signaler` et API de suivi présentes, mais entrée retirée du menu. Fonction à réévaluer avant exposition publique.

Midi, Soirées, Serein, Bonnes nouvelles et Mon Saint-Roch affichent des pages de présentation. L'import social est simulé. Les avantages commerciaux ne sont pas utilisables en caisse.

## Technologies

Next.js 16.4.1 avec App Router et Turbopack, React 19.3.0, TypeScript, Tailwind CSS 4 et CSS, Zod, SQLite via better-sqlite3, Leaflet et MapLibre GL. ExcelJS lit les fichiers facultatifs côté serveur. npm et `package-lock.json` verrouillent les dépendances.

## Architecture

```text
src/app/              Pages et routes API
src/components/       Interfaces React, cartes et styles associés
src/lib/              Services métier, validation, types et SQLite
public/               Images, icônes et crédits
donnees-ouvertes/     Instantanés publics de mobilité et d'adresses
scripts/              Préparation locale, démo et vérifications
tests/                Tests métier et scénarios HTTP
docs/                 Architecture, audit, qualité et captures
data/                 Base et médias locaux, ignorés par Git
```

[Architecture détaillée et migrations](docs/architecture.md).

## Lancement local

Prérequis : **Node.js 24 LTS**, npm et Git. Voir `.nvmrc`. Aucun compte d'API ni serveur de base de données obligatoire. Internet est nécessaire pour installer les dépendances, charger les fonds cartographiques et télécharger Inter à la compilation.

Pour obtenir cette révision **après publication de sa branche** :

```bash
git clone --branch chore/recruiter-ready-repository https://github.com/ManuellaNoukimi/Propulser-Saint-Roch.git complice
cd complice
```

Cette préparation n'effectue pas de publication automatique. Pour une copie locale déjà fournie, ouvrir directement un terminal à sa racine. Dans PowerShell :

```powershell
npm ci
Copy-Item .env.example .env.local
npm run demo:seed
npm run dev
```

Sous macOS/Linux, remplacer la copie par `cp .env.example .env.local`.

Ouvrir **http://localhost:3000**. Si le port est occupé : `npm run dev -- --port 3001`. Le remplissage prépare aussi le schéma. Sans comptes fictifs, `npm run db:prepare` prépare la base et les exemples de locaux existants. L'application prépare également la base à sa première utilisation.

Pour le mode production local :

```bash
npm run build
npm start
```

Les scripts historiques écoutent sur toutes les interfaces réseau. Pour rester sur cet ordinateur, ajouter `-- --hostname 127.0.0.1` à dev/start. Ne pas exposer le prototype sur Internet avec les comptes de démo.

## Variables d'environnement

[`.env.example`](.env.example) décrit toutes les variables, facultatives pour la démo. `.env.local` reste ignoré.

- `COMPLICES_DATA_DIR` : dossier SQLite et médias. Vide = `data/`.
- `COMPLICES_DIST_DIR` : cache de compilation. Vide = `.next`.
- `COMPLICES_HTTPS` : cookie sécurisé pour `1` avec NODE_ENV en production.
- `COMPLICES_SDC_USER_IDS` et `COMPLICES_SDC_API_KEY` : autorisation SDC serveur, vide par défaut. Ne jamais rendre la clé publique avec `NEXT_PUBLIC_`.
- `COMPLICES_MIDI_CODE` : code du Midi simulé.
- `COMPLICES_EVENTS_XLSX`, `COMPLICES_ENTREPRISES_XLSX`, `COMPLICES_PARKING_GEOJSON` : fichiers privés facultatifs. Absents, les listes externes concernées sont vides et les replis locaux restent utilisables.

Ne pas versionner les classeurs du concours, bases réelles, informations personnelles ou secrets. Sauvegarder une base existante et ses médias avant migration. L'ancienne commande `reset-db` supprime tout le dossier data : ne pas l'utiliser sur des données à conserver.

## Démonstration locale

`npm run demo:seed` crée des personnes et structures fictives :

- `resident@example.test` : Alex, résident avec participation et besoin de quartier.
- `organisme@example.test` : collectif fictif, auteur des trois initiatives.
- `commerce@example.test` : commerce fictif pour tester l'espace entreprise.

**Mot de passe public de ces trois comptes : `Demo-Complice-2026!`.** Aucun accès SDC n'est accordé. Les dates sont relatives au lancement du script. Une relance actualise les activités et réutilise les comptes. Les images restent illustratives, avec crédits conservés.

Parcours : connexion résident, Vie à Saint-Roch, détail d'une initiative, Vitrines puis Mon profil. Les bases et médias locaux ne sont pas versionnés. [L'ancien guide du hackathon](DEMO_COMPTES.md) reste une référence historique : ses comptes et dates ne sont pas créés par cette commande.

## Tests et validation

```bash
npm test
npm run test:http
npm run lint
npm run typecheck
npm run build
npm run check:repository
npm audit
```

Les tests métier isolent leurs bases temporaires. Les trois scénarios HTTP utilisent leurs propres serveurs sur 3014, 3015 et 3017, séquentiellement. Ne pas lancer deux suites HTTP en parallèle. Le contrôle de dépôt repère certains fichiers privés et motifs de secrets, sans afficher leur contenu et sans garantie exhaustive.

[Résultats réellement exécutés et checklist](docs/qa-checklist.md).

## Limites du prototype

Authentification simplifiée, courriels non vérifiés, absence de limitation globale des tentatives, services cartographiques externes, horaires RTC figés, présence et offres partiellement simulées. Le manifeste mobile ne constitue pas un mode hors ligne complet. Les migrations de très anciennes bases peuvent supprimer leur ancien schéma.

L'audit npm du 21 octobre 2026 signale **8 dépendances affectées, dont une alerte critique MapLibre GL**. La mise à niveau majeure et les tests cartographiques associés restent à traiter avant un déploiement public. [Détails](docs/qa-checklist.md). Le dépôt n'est pas présenté comme prêt pour la production.

## Améliorations envisagées

Résoudre les alertes de dépendances, renforcer l'authentification, tester la carte après mise à niveau et préparer des migrations avec restauration vérifiée. Puis conduire un pilote avec des partenaires et mesurer les usages. Aucune adoption, récompense de concours ou retombée chiffrée n'est revendiquée.

## Contexte et équipe

Prototype réalisé en équipe pendant le Hackathon de Québec International en octobre 2026, pour faciliter les interactions locales dans Saint-Roch.

Identifiants publics dans l'historique : **ManuellaNoukimi**, **danny-abt** et **Stman24**. Les noms complets et rôles non documentés ne sont pas inventés. Les contributions sont conservées. Aucune licence collective n'a été ajoutée sans accord de l'équipe.

## Ma contribution

Le commit [580ea43 — Ajoute les vitrines dynamiques et la progression des résidents](https://github.com/ManuellaNoukimi/Propulser-Saint-Roch/commit/580ea43) est attribué dans Git à **ManuellaNoukimi**. Son diff permet de rattacher à cette contribution :

- les services et routes de la Vitrine, des besoins géographiques, des soutiens et des demandes d'occupation ;
- l'import SDC et la distinction entre localisations vérifiées et à confirmer ;
- la progression résident : points, badges, confidentialité et intégration au profil ;
- les tests métier/HTTP et la documentation de ces fonctions.

Le code actuel a ensuite été adapté par d'autres membres. Cette attribution concerne le commit identifié, pas tout le produit ni une propriété exclusive des composants actuels. Le développement a bénéficié d'une assistance IA. La présente préparation ajoute documentation, configuration locale, démo et contrôles, sans réécrire les fonctions de l'équipe.

## Remerciements et sources

Merci à l'équipe du hackathon et aux fournisseurs de données : [OpenStreetMap](https://www.openstreetmap.org/copyright), [Ville de Québec / Données Québec](https://www.donneesquebec.ca/), [RTC](https://www.rtcquebec.ca/), flux àVélo, OpenFreeMap et Esri. Les données embarquées sont des instantanés publics. Les classeurs privés du concours ne sont pas redistribués.

Les images ne prouvent pas l'existence d'événements réellement organisés par Complice. [Crédits des images](public/images/activities/CREDITS.md), [ressources historiques](scripts/photos-direct/CREDITS.md), [licence des icônes Lucide](public/icons/LICENSE.lucide). [Versions LTS Node.js](https://nodejs.org/en/about/previous-releases).
