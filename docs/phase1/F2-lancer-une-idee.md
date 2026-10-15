# F2 — Lancer une idée : « Trouver mes complices » (P1, problème 1)

**État : 🟢 Fait (un écart)**

Fichiers : `src/components/LaunchIdea.tsx`, `src/lib/matching.ts`, `src/app/api/match/route.ts`, `src/app/api/invitations/`, `src/components/ActivityView.tsx`, `src/components/PostDetail.tsx`, `src/lib/invites.ts`

## Fait

- [x] Saisie d'une phrase, écrite ou **dictée** (reconnaissance vocale du navigateur), avec exemples.
- [x] Bouton **[Trouver mes complices]** avec étapes animées (« Je comprends ton idée… »).
- [x] Moteur par catégories et mots-clés (`findComplices`) : jusqu'à 5 acteurs suggérés, chacun avec une ou deux raisons (« pourquoi lui ») et une contribution proposée.
- [x] Lieu proposé (lieux publics de Saint-Roch, avec explication).
- [x] Matériel nécessaire et logistique, avec liens officiels de la Ville.
- [x] Date proposée sans conflit avec les activités déjà prévues.
- [x] Lien avec les actions du Plan d'action 2026-2029.
- [x] Sélection des complices et **[Inviter X complices et publier]**.
- [x] Connexion express intégrée si la personne n'est pas connectée.
- [x] Côté invité : onglet Activité, « Tu es invité·e à… », **[Je suis complice]** et **[Pas cette fois]**. Accepter ajoute la personne aux complices.
- [x] Notification à l'écran à l'arrivée d'une invitation (sondage toutes les 6 s) et pastille sur la cloche.
- [x] Côté organisateur : suivi « x / y ont dit oui » avec barre de progression, rafraîchi en direct.

## Reste à faire

- [ ] **Publier seulement quand il y a des oui** : l'idée est publiée immédiatement (`LaunchIdea.tsx`, appel à `/api/ideas`). Ajouter un statut `brouillon` sur `ideas`, caché de l'accueil jusqu'à la première invitation acceptée. Si on garde le comportement actuel, le dire clairement pendant la démo.
- [ ] **Au moins 3 suggestions** : le moteur peut en renvoyer moins de 3 si peu de comptes correspondent. Vérifier les phrases de la démo, ou compléter avec les acteurs les plus actifs.
- [ ] Brancher les points F6 : +30 quand l'idée obtient au moins 2 complices, +15 pour chaque personne qui devient complice.
- [ ] (Facultatif) Appel à un modèle de langage à la place des mots-clés, avec repli sur le moteur actuel.
