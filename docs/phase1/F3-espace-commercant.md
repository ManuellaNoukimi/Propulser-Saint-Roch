# F3 — Espace commerçant et organisme (P1, problèmes 1 et 2)

**État : 🟡 Partiel**

Fichiers : `src/components/CreatePost.tsx`, `src/components/ProfileView.tsx`, `src/app/u/[id]/page.tsx`, `src/components/EditProfile.tsx`, `src/components/AuthForms.tsx`, `src/lib/quartier.ts` (`OFFER_KINDS`)

## Fait

- [x] Deux types de comptes : Résident·e et Entreprise (commerce, entreprise, organisme), avec secteur d'activité.
- [x] Compte de démo connectable « Café du Coin (démo) » (voir `DEMO_COMPTES.md`).
- [x] Publication en environ 1 minute : photos, texte, lieu, date, catégorie, besoins.
- [x] Profil public de l'établissement `/u/[id]` : description, adresse, publications, badges, partage du profil.
- [x] Modification du profil (`/moi/modifier`).
- [x] Les publications des entreprises restent ; celles des résidents disparaissent 6 h après l'événement.

## Reste à faire

- [ ] **Type de publication promo, nouveauté ou événement** : `OFFER_KINDS` existe dans `quartier.ts` mais n'est pas utilisé dans `CreatePost`. Ajouter une colonne `kind` sur `ideas` (ou une table `offers`).
- [ ] **Faire remonter promos et nouveautés dans « Nouveau dans le quartier »** (F1), à la place du tableau fixe `NEWS`.
- [ ] **Badge « Commerce complice » / « Organisme complice »** selon le nombre de publications et de collaborations (complices donnés ou reçus). Calcul possible dans `src/lib/badges.ts`.
- [ ] **Offres sur le profil public** : section « Offres en cours » sur `/u/[id]`.
- [ ] **Carte ou liste des acteurs du quartier** : l'onglet Explorer montre des publications, pas des acteurs. Ajouter une liste des établissements (filtre par secteur), et une carte si les adresses sont géocodées (`src/lib/geocode.ts` existe déjà).
- [ ] **Bouton « Publier une promo » dans Vitrines** : il affiche seulement un message de confirmation, rien n'est enregistré. Le rediriger vers `/creer` avec le type promo.
- [ ] Brancher le score acteur de F6 (indicateur de lien pour la SDC).
