# F6 — Profil, score, badges et récompenses (P1)

**État : 🔴 Presque tout manque**

Fichiers existants : `src/lib/badges.ts`, `src/components/BadgeChips.tsx`, `src/components/ProfileView.tsx`, `src/app/u/[id]/page.tsx`, `src/app/moi/`

## Fait

- [x] Cinq badges calculés à partir des contributions de complice (`badgesFor`) :
  - Super voisin (au moins 3 initiatives rejointes)
  - Bonne personne (aide concrète)
  - Bâtisseur (au moins une idée lancée)
  - Rassembleur (une idée avec au moins 5 complices)
  - Premier complice
- [x] Badges affichés sur les profils d'établissement et auprès des complices d'une idée.
- [x] Aucune série quotidienne ni pénalité (rien de tel n'a été codé).

## Reste à faire

### Points
- [ ] Table `points` (user, action, référence, points, date) : historique privé, score qui **ne baisse jamais**.
- [ ] Attribution selon le barème :

| Action | Points | Où le brancher |
|---|---|---|
| Check-in à une activité (QR) | 10 | Nouvelle page de check-in |
| Coup de main confirmé | 20 | F1, après confirmation de l'organisateur |
| Idée avec au moins 2 complices | 30 | F2, acceptation d'invitation et complices |
| Devenir complice d'une idée | 15 | `insertComplice` |
| Vote sur une vitrine vide | 5, plafonné par jour | F4 (une fois les votes enregistrés) |
| Midi Complice chez un commerce | 10 | F5, code en caisse |
| Réserver une vitrine vide | 40 | F4, confirmation SDC |
| Inviter un ami qui s'inscrit | 10 | Inscription avec code d'invitation |

- [ ] Plafond de points par jour, et un seul check-in par lieu et par jour.
- [ ] **Aucun point pour les signalements** (F7), en particulier ceux qui concernent des personnes.

### Check-in QR (simulé)
- [ ] Une page `/checkin/[ideaId]` qui représente le QR affiché sur place. Un QR affiché à l'écran pour la démo, avec la mention « simulé ».

### Niveaux, badges, récompenses
- [ ] Niveaux : Voisin, Complice, Complice de quartier, Pilier de Saint-Roch (seuils à fixer, ex. 0, 50, 150, 400).
- [ ] Badges thématiques de la spec : « Bâtisseur d'idées », « Ami des vitrines », « Coup de main ». Renommer ou compléter les badges actuels.
- [ ] Paliers de rabais (ex. 100 points = 10 % chez les commerces participants), avec une carte à présenter en caisse. Paiement simulé.
- [ ] Le commerçant choisit et finance son offre (F3).
- [ ] Score « Commerce complice » pour les acteurs (lien avec F3), comme indicateur pour la SDC.

### Profil
- [ ] Afficher score, niveau et prochain palier sur `/moi`.
- [ ] Les résidents n'ont pas de profil public aujourd'hui. Ajouter un profil public **optionnel** qui ne montre que le niveau et les badges, jamais l'historique de lieux.
- [ ] Niveaux plutôt qu'un classement public : ne pas créer de palmarès.
