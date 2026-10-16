# F4 — API vitrines et SQLite

Le menu « Vitrines », sous « Événements », ouvre `/vitrines`. La carte lit les agrégats SQLite ; les votes et réservations appellent les API et sont rechargés après écriture. Les demandes en attente sont visibles seulement pour leur auteur. La vue SDC reste fournie sous forme de données à `/api/vacancies/sdc` ; aucune page `/vitrines/sdc` n’est créée.

## Base de données

Les tables `vacancies`, `vacancy_votes`, `vacancy_bookings` sont créées au démarrage du serveur, dans la base existante `data/complices.db`. Migration additive et idempotente, sans changement de `user_version` ni suppression des données. Sans import SDC, les cinq locaux `v1` à `v5` sont fictifs et signalés `isDemo: true`. Après import, seuls les locaux vacants de l’instantané SDC actif sont affichés ; les exemples restent conservés en base. Voir `docs/SDC-import.md` pour les localisations à confirmer. Les compteurs démarrent à zéro : les chiffres fictifs du composant ne deviennent pas des votes réels.

Un vote est lié à l'utilisateur de la session et au local : unicité en base, fréquence 0/1/2/3, souhait validé. Trois nouveaux votes maximum par jour civil `America/Toronto` et par compte. Aucun point F6 n'est crédité ici ; les identifiants persistants des votes et confirmations permettent une intégration ultérieure sans récompenses répétées. L'authentification actuelle est celle de la démo : plusieurs comptes créés par la même personne ne peuvent pas être détectés.

Les réservations durent de une à quatre semaines. `startsOn` est une date québécoise `YYYY-MM-DD`, `endsOn` est exclusive. Les demandes restent `pending` jusqu'à confirmation explicite SDC. Deux demandes de personnes différentes peuvent se chevaucher ; une seule pourra être confirmée. Une occupation confirmée empêche de nouvelles demandes sur la même période. Les réservations contiguës sont permises.

## Accès SDC

Dans `.env.local`, définir `COMPLICES_SDC_USER_IDS` avec les identifiants des comptes autorisés, séparés par des virgules, et `COMPLICES_SDC_API_KEY` avec un secret aléatoire d'au moins 32 caractères, puis redémarrer le serveur. Récupérer l'identifiant du compte connecté via `GET /api/auth/me`. Les deux routes SDC exigent la session autorisée **et** ce secret dans l'en-tête `X-SDC-Key`. Sans configuration complète, l'accès est refusé. Ne jamais embarquer le secret dans du code client ou le versionner. Aucune permission n'est accordée en fonction du type de profil.

Le projet autorise par défaut une connexion sans mot de passe : la clé SDC supplémentaire évite que connaître le nom du compte permette d'accéder aux demandes privées ou de confirmer. Les autres sessions conservent leur comportement de démo. Pour sortir du prototype local, l'authentification des comptes doit être traitée séparément.

## Routes

- `GET /api/vacancies` : inventaire public, agrégats réels par souhait, total de votes, visites promises, occupations confirmées non terminées, vote du visiteur connecté (`myVote`), plafond quotidien. Aucun demandeur ni vote individuel d'autrui.
- `POST /api/vacancies/:id/votes` : session requise, JSON `{ "wish": "epicerie", "frequency": 2 }`. Retour `201 { vote }`, doublon `409`, plafond `429`, validation `400`, local absent `404`.
- `POST /api/vacancies/:id/bookings` : session requise, JSON `{ "project": "expo", "title": "Expo photo", "weeks": 2, "startsOn": "2027-01-18" }`. Retour `201 { booking }`, conflit/demande répétée `409`, date passée ou données invalides `400`, titre refusé par modération `422`.
- `GET /api/vacancy-bookings` : demandes de la personne connectée uniquement.
- `GET /api/vacancies/sdc` : session SDC requise, demande par local, classement du quartier et réservations avec demandeur, statut et responsable de confirmation.
- `PATCH /api/vacancy-bookings/:id` : session SDC requise, JSON `{ "status": "confirmed" }`. Retour `200 { booking }`, conflit de période ou demande expirée `409`. Confirmation atomique et idempotente : une répétition ne génère pas un nouvel événement.

Les routes privées renvoient `401` sans session et `403` sans permission SDC. Le serveur ignore toute identité fournie par le client : les schémas de saisie stricts rejettent les champs supplémentaires. Les réponses F4 utilisent `Cache-Control: private, no-store`.

## Accueil

Une confirmation crée une publication dans `ideas`, liée à la réservation via `idea_id`, au nom du demandeur. Elle arrive dans le fil existant `/api/ideas` sans modifier le front ; un accueil déjà ouvert doit être rechargé. La purge des publications de résidents conserve cette publication jusqu'à la fin exclusive de l'occupation. Les événements d'établissement suivent ensuite leur règle habituelle de conservation.

## Vérification

Exécuter les tests sur une base temporaire, sans toucher à la base réelle :

```powershell
node --conditions=react-server --test tests/vacancies.test.cjs
node --conditions=react-server tests/vacancies-http.cjs
npx.cmd tsc --noEmit
npx.cmd eslint src/lib/vacancies.ts src/lib/vacancy-schema.ts src/lib/vacancy-http.ts src/app/api/vacancies src/app/api/vacancy-bookings
```

Le test HTTP démarre puis arrête son propre serveur sur `127.0.0.1:3014`, utilise `.next-test` et une base temporaire. `F4_TEST_PORT` permet de changer ce port. Il ne faut pas lancer deux serveurs partageant `.next-test` simultanément. SQLite étant un module natif, utiliser la même version majeure de Node.js que celle employée lors de l'installation des dépendances.
