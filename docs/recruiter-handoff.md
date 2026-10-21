# Bilan de préparation du dépôt

## Diagnostic et résultat

Le README initial était celui de create-next-app. L'application disposait déjà de services métier et de tests, mais ne proposait ni commande de tests, ni exemple d'environnement, ni démonstration datée indépendamment du jour du hackathon. Les fichiers privés n'étaient pas suivis. La structure de code était cohérente et a été conservée.

La révision apporte une présentation française fidèle, une contribution rattachée au commit Git de ManuellaNoukimi, cinq captures réelles, un jeu fictif relançable, la préparation SQLite et les commandes de vérification. Aucun fichier applicatif src/ n'est modifié, aucun fichier important déplacé ou supprimé, aucune licence ajoutée. La branche est `chore/recruiter-ready-repository`. Aucun push, fusion ou pull request n'est effectué.

## Arborescence finale utile

```text
README.md
.env.example
.gitignore
.nvmrc
package.json / package-lock.json
eslint.config.mjs
src/
  app/             Pages, API et CSS global
  components/      Interfaces et cartes
  lib/             Services, validation, types et SQLite
public/            Ressources et crédits existants
donnees-ouvertes/   Instantanés publics existants
docs/
  architecture.md
  audit-initial.md
  qa-checklist.md
  recruiter-handoff.md
  screenshots/     README et cinq images réelles
scripts/           Scripts du hackathon et nouveaux outils locaux
tests/             Tests existants conservés
data/              Créé localement, ignoré
```

## Fichiers modifiés

README.md, .gitignore, package.json, package-lock.json et eslint.config.mjs. Le verrouillage n'a pas été régénéré pour une mise à niveau : son entrée racine reflète uniquement la version Node recommandée.

## Fichiers créés

- `.env.example`, `.nvmrc`.
- `scripts/check-repository.cjs`, `scripts/load-typescript.cjs`, `scripts/prepare-db.cjs`, `scripts/recruiter-demo.cjs`, `scripts/test-http.cjs`.
- `docs/architecture.md`, `docs/audit-initial.md`, `docs/qa-checklist.md`, `docs/recruiter-handoff.md`.
- `docs/screenshots/README.md`, `accueil.jpg`, `vie-quartier.jpg`, `vitrine.jpg`, `profil-mobile.jpg` et `vie-mobile.jpg` dans ce même dossier.

## Démarrage exact d'une copie de cette branche

Avec Node.js 24 LTS, dans PowerShell à la racine du dépôt :

```powershell
npm ci
Copy-Item .env.example .env.local
npm run demo:seed
npm run dev
```

Puis http://localhost:3000. Connexion : `resident@example.test`, mot de passe fictif public `Demo-Complice-2026!`. La copie initiale de .env.example s'applique à une installation neuve, ne pas écraser une configuration personnelle existante. Pour rester sur la machine : `npm run dev -- --hostname 127.0.0.1`.

## Vérifications réalisées

Installation propre et second clone local démarrés, 32 tests métier réussis, trois scénarios HTTP réussis, lint et TypeScript sans échec, compilation et serveur de production réussis. 25 chemins HTTP contrôlés. Parcours navigateur et cinq captures réelles, contrôles ponctuels au clavier et à 390 pixels. Les détails et limites sont dans [qa-checklist.md](qa-checklist.md).

## Points restants

Huit paquets sont signalés par npm audit, dont une alerte critique MapLibre GL. Une mise à niveau majeure vérifiée est nécessaire avant exposition publique. Les pictogrammes manquants du style cartographique externe, l'authentification de démonstration, les migrations anciennes, les tests multi-navigateurs et un audit complet d'accessibilité restent à traiter. Aucun résultat non exécuté n'est annoncé comme réussi.

## Informations à compléter sans bloquer cette révision

Les noms complets et rôles souhaités des membres pourraient préciser l'attribution au-delà des identifiants Git publics. L'équipe devra choisir ensemble une licence éventuelle. Aucun lien de démonstration publique n'existe à ce jour, confirmé par la porteuse du dépôt. Ces informations ne sont pas inventées.

## Ce qu'un recruteur peut comprendre

Le problème ciblé, le parcours résident et les fonctions entreprise existantes sont visibles rapidement. Le README distingue les fonctions codées des simulations et concepts. La contribution de Manuella est vérifiable dans Git. Le recruteur dispose d'un démarrage local sans clés d'API obligatoires, d'identifiants fictifs, de captures et de contrôles qualité transparents. Les limites ne sont pas cachées derrière une promesse de production.
