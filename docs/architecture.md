# Architecture de Complice

## Organisation conservée

```text
README.md                    Présentation et démarrage
.env.example                 Configuration sans secret
src/app/                     Pages Next.js et routes HTTP sous api/
src/components/              Interfaces React, cartes et styles associés
src/lib/                     Types, validation, services métier et accès SQLite
src/app/globals.css          Styles globaux et Tailwind CSS
donnees-ouvertes/            Instantanés publics utilisés par la mobilité
public/                      Icônes, images et crédits
docs/screenshots/            Captures réelles du prototype
docs/                        Architecture, audit, qualité et spécifications historiques
scripts/                     Préparation locale, import et vérifications
tests/                       Tests métier et scénarios HTTP existants
data/                        SQLite et médias locaux, ignorés par Git
```

Le projet utilise l'App Router de Next.js 16.4.1 et React 19.3.0. `src/app/layout.tsx` fournit le cadre commun et la session. `src/app/page.tsx` ouvre l'accueil. Les composants clients appellent les routes `src/app/api/**/route.ts`. Ces routes valident les entrées avec Zod, récupèrent la session puis appellent les services de `src/lib/`. Les requêtes SQLite passent par better-sqlite3. Les imports `@/` pointent vers `src/`.

Cette organisation convient à un prototype : déplacer tous les services dans un nouveau dossier n'apporterait pas de valeur immédiate. Les cartes utilisent Leaflet et MapLibre GL. Les styles combinent Tailwind CSS 4 et des fichiers CSS proches des composants.

## Persistance et migrations

`npm run db:prepare` appelle le même `getDb()` que l'application. Il crée `data/complices.db`, active les clés étrangères et WAL, prépare le schéma principal puis les schémas vitrines, besoins, SDC et progression. L'application le fait aussi à sa première requête nécessitant la base. Aucun serveur SQL ni compte externe n'est nécessaire.

Attention aux bases anciennes : le schéma principal de version inférieure à 2 supprime certaines anciennes tables avant de les recréer. Le nettoyage historique retire aussi une fois les comptes `@complices.local`. Sauvegarder toute base existante et ses médias avant migration. Cette procédure convient au démonstrateur, pas à une migration de production sans sauvegarde et test de restauration. Les ajouts F4/F6 sont additifs.

`npm run demo:seed` est explicite et réservé au développement. Il crée des comptes fictifs marqués, trois activités datées relativement au lancement, une participation et un besoin. Il ne copie aucune base existante ni aucun classeur. Une relance réutilise les comptes et activités, actualise les dates des activités de démonstration et ne double pas la participation. Les cinq locaux fictifs viennent du schéma existant et restent identifiés comme exemples.

## Services et données externes

- OpenStreetMap : données et attribution, Nominatim pour la recherche, OSRM pour les trajets. En échec de routage, le code renvoie un tracé approximatif, pas un itinéraire certifié.
- OpenFreeMap et Esri : fonds cartographiques. Leur chargement demande Internet.
- àVélo : flux GBFS pour l'état des stations. Une indisponibilité externe peut réduire l'information affichée.
- RTC : instantané d'horaires GTFS dans `donnees-ouvertes/rtc-bus.json`. Les passages calculés ne constituent pas du suivi GPS en temps réel.
- Ville de Québec : instantanés d'adresses et limite du quartier, fichiers locaux facultatifs pour événements et stationnements.
- Classeurs SDC et entreprises du hackathon : facultatifs, non distribués. Les fonctionnalités centrales se testent sans eux. Aucun accès Google Maps payant n'est nécessaire, seuls des liens d'itinéraire sont produits.
- Google Fonts : Inter est téléchargée par `next/font` pendant la compilation. Une première compilation a besoin de réseau.
- Réseaux sociaux : import simulé, sans connexion réelle aux API Meta/LinkedIn.

## Sécurité et limites de déploiement

Les mots de passe définis sont hachés par scrypt. Les sessions utilisent un cookie httpOnly et un jeton aléatoire dont l'empreinte est conservée en base. Les autorisations résident et SDC sont vérifiées côté serveur. Les clés administratives ne sont jamais publiques.

Le parcours invité, les contraintes de mot de passe très faibles, l'absence de vérification de courriel et l'absence de limitation globale des tentatives d'authentification sont des choix du prototype à revoir avant exposition publique. Ne pas utiliser de vraies informations personnelles, de récompenses financières ou les identifiants de démo dans une installation publique. Les points de présence et le Midi incluent des simulations. Le manifeste mobile n'implique pas un fonctionnement hors ligne complet : aucun service worker n'est installé.
