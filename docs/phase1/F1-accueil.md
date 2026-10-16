# F1 — Accueil « Ça se passe à Saint-Roch » (P1, problème 2)

**État : 🟡 En bonne partie**

Fichiers : `src/components/Feed.tsx`, `src/components/Happening.tsx`, `src/components/EventsView.tsx`, `src/app/page.tsx`

## Fait

- [x] Section « Ça se passe à Saint-Roch » en haut de l'accueil, avec les activités des 14 prochains jours triées par date.
- [x] Cartes d'activité : titre, jour, heure, lieu, catégorie.
- [x] Étiquettes déduites automatiquement (`tagsOf`) : Gratuit, En famille, Le midi, Le soir, Viens seul·e.
- [x] Filtres en un toucher : Ce soir, Ce week-end, Gratuit, Avec les enfants (plus Tout et En ce moment).
- [x] Badge « En ce moment » sur les activités commencées ou qui commencent dans l'heure.
- [x] Bouton **[J'y vais]** : inscrit la personne comme complice « participer ».
- [x] Bouton **[Coup de main]** : inscrit la personne comme complice « bénévole », visible par l'organisateur.
- [x] Bandeau Midi Complice du lundi au vendredi (lien vers F5).
- [x] Section « Nouveau dans le quartier » (contenu fixe, voir plus bas).
- [x] Agenda complet `/evenements` groupé par jour (Aujourd'hui, Demain, Cette semaine…).
- [x] Partage d'une publication (partage natif ou copie du lien) sur la carte de publication et la page détail.
- [x] Jeu de données de démo : environ 17 publications réalistes (commerces, organismes, citoyens).

## Reste à faire

- [ ] **« En ce moment » à moins de 10 min à pied** : le filtre ne regarde que l'heure. Ajouter la position (GPS ou coordonnées des lieux de `PLACES`) et un calcul de distance (environ 800 m).
- [ ] **Rappel 1 h avant** pour [J'y vais] : notification du navigateur, ou au minimum un rappel simulé dans l'onglet Activité.
- [ ] **État des boutons conservé** : après un rechargement, [J'y vais] et [Coup de main] redeviennent non cochés. Renvoyer depuis l'API si la personne est déjà complice.
- [ ] **Coup de main = proposition à l'organisateur** : aujourd'hui, c'est une inscription directe. Prévoir une confirmation par l'organisateur (nécessaire aussi pour les 20 points de F6).
- [ ] **Suivre un lieu ou un organisme** : rien n'existe (table `follows`, bouton sur le profil `/u/[id]`, filtre « Ce que je suis »).
- [ ] **Repartager depuis la carte d'événement** : réutiliser `usePostActions` dans `EventCard`.
- [ ] **« Nouveau dans le quartier » alimenté par les vraies publications** : le tableau `NEWS` est fixe. L'alimenter avec les publications de type promo ou nouveauté (dépend de F3).
- [ ] **Calendrier de la Ville simulé** : ajouter quelques événements « Ville de Québec » au jeu de démo (et les identifier comme tels).
- [ ] Une section explicite « Cette semaine », distincte du carrousel (facultatif : le filtre couvre déjà le besoin).
