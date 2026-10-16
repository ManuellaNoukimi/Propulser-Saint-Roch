# F4 — Vitrines à remplir (P1, problème 4)

**État : 🟡 Affichage fait, rien n'est enregistré**

Fichiers : `src/components/VitrinesView.tsx`, `src/app/vitrines/page.tsx`, `src/lib/quartier.ts` (`WISHES`, `FREQUENCIES`, `BOOKING_PROJECTS`)

## Fait

- [x] Carte Leaflet de Saint-Roch (limite officielle) avec les locaux vides en pastille orange.
- [x] Locaux d'exemple, clairement identifiés comme fictifs (mention « Démo » en bas de page).
- [x] Fiche de local : adresse, surface, description.
- [x] **[Ce que je veux ici]** : vote parmi épicerie, boucherie, boulangerie, fruiterie, café, resto, pharmacie, librairie, quincaillerie, autre.
- [x] Barres de résultats et compteur de votes par local.
- [x] « J'y irais environ X fois par semaine », additionné en « visites par semaine promises ».
- [x] **[L'occuper en attendant]** : réservation de 1 à 4 semaines (expo, boutique éphémère, atelier, projet étudiant).
- [x] Classement « Ce qui manque le plus, dans tout le quartier ».
- [x] Liens avec les actions 3.5, 3.10 et 2.8 du Plan.

## Reste à faire

- [ ] **Enregistrer votes et réservations** : tout est en mémoire du navigateur (`useState(VACANCIES)`). Un rechargement efface tout, et personne d'autre ne voit les votes. Ajouter des tables SQLite `vacancies`, `vacancy_votes` (user, local, souhait, fréquence, date) et `vacancy_bookings`, avec les routes API correspondantes.
- [ ] **Vue SDC** : page réservée (ou simplement `/vitrines/sdc` pour la démo) avec la demande par local (votes par souhait, visites promises, réservations). C'est l'étape 3 du fil de démo.
- [ ] **Un vote par personne et par local**, et plafond quotidien (nécessaire pour les +5 points de F6).
- [ ] **Confirmation SDC d'une réservation** : statut « en attente / confirmée » (nécessaire pour les +40 points de F6).
- [ ] Afficher la vitrine réservée dans l'accueil F1 (ex. l'expo devient un événement).
