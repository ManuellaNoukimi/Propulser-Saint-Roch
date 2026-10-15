# Phase 1 — État des fonctionnalités

État du code au 15 octobre 2026, comparé au fichier « Remarques et fonctionnalités attendues (Phase 1) ».

| # | Fonctionnalité | Priorité | État | Fiche |
|---|---|---|---|---|
| F1 | Accueil « Ça se passe à Saint-Roch » | P1 | 🟡 En bonne partie | [F1-accueil.md](F1-accueil.md) |
| F2 | Lancer une idée | P1 | 🟢 Fait (un écart) | [F2-lancer-une-idee.md](F2-lancer-une-idee.md) |
| F3 | Espace commerçant et organisme | P1 | 🟡 Partiel | [F3-espace-commercant.md](F3-espace-commercant.md) |
| F4 | Vitrines à remplir | P1 | 🟡 Affichage fait, rien n'est enregistré | [F4-vitrines.md](F4-vitrines.md) |
| F5 | Midi Complice | P2 | 🟡 Affichage fait, rien n'est enregistré | [F5-midi-complice.md](F5-midi-complice.md) |
| F6 | Profil, score, badges, récompenses | P1 | 🔴 Presque tout manque | [F6-score-badges.md](F6-score-badges.md) |
| F7 | Signalement | P1 | 🟡 Parcours A partiel, parcours B absent | [F7-signalement.md](F7-signalement.md) |

## Fil de démo

| Étape | Fonctionne ? |
|---|---|
| 1. Un commerçant publie, ça apparaît sur l'accueil | 🟡 Visible dans le fil (et dans l'agenda si la publication est datée), pas dans « Nouveau dans le quartier » |
| 2. Un citoyen lance une idée, l'app propose des complices | ✅ |
| 3. Vote sur une vitrine vide, la SDC voit la demande | 🟡 Le vote fonctionne mais n'est pas enregistré ; pas de vue SDC |
| 4. Check-in QR, points, rabais débloqué | ❌ |
| 5. Rue sale, puis personne qui a besoin d'aide, avec suivi | 🟡 / ❌ |

## Ordre suggéré d'ici vendredi

1. F6 minimum : points, niveaux, check-in QR simulé, palier de rabais.
2. F7 : parcours B, plus acheminement simulé et suivi de statut pour le parcours A.
3. F4 : enregistrer votes et réservations dans SQLite, plus une vue SDC.
4. F3 : types promo et nouveauté, qui alimentent « Nouveau dans le quartier » (F1).
5. Petites corrections : partage sur les cartes d'événement, état « J'y vais » conservé, mise à jour de `src/lib/features.ts`.

## Points transversaux

- `src/lib/features.ts` marque encore Midi et Vitrines comme « bientôt ». Le texte de Signaler décrit l'ancien modèle besoin / problème, et `/fonctionnalites` présente les 9 problèmes sans distinguer la phase 1.
- Honnêteté de la démo : Vitrines et Midi affichent déjà une ligne « Démo : … fictifs ». Ajouter la même mention pour l'acheminement 311 et organismes, les QR et les rabais.
- `README.md` à la racine est encore le texte par défaut de create-next-app.
- `node_modules` n'était pas installé au moment de l'analyse : la vérification de types (`tsc`) n'a pas été lancée.
