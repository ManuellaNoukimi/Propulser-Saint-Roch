# F5 — Midi Complice, version légère (P2, problème 3)

**État : 🟡 Affichage fait, rien n'est enregistré**

Fichiers : `src/components/MidiView.tsx`, `src/app/midi/page.tsx`, `src/lib/quartier.ts` (`WEEKDAYS`, `MIDI_KINDS`), `src/lib/now.ts`

## Fait

- [x] Page « Aujourd'hui midi à Saint-Roch », du lundi au vendredi, avec choix du jour.
- [x] Propositions de 30 min maximum : tables complices et pauses actives, avec places réservées.
- [x] Rabais travailleurs chez plusieurs commerces (exemples fictifs).
- [x] **Carte travailleur** à montrer en caisse (dégradé animé et horloge en direct pour éviter les captures d'écran).
- [x] « Je travaille à Saint-Roch » avec choix des jours de présence.
- [x] Formulaire commerçant « Publier mon offre du midi » (titre, pourcentage, jours).
- [x] Partage « À mon équipe » et lien vers un dîner-rencontre (F2).
- [x] Bandeau Midi sur l'accueil F1 en semaine.
- [x] Mention « Démo : propositions, commerces et chiffres fictifs ».

## Reste à faire

- [ ] **Indicateur d'achalandage** des restaurants, saisi par les utilisateurs pendant l'attente (ex. boutons « Vide / Ça va / Plein », moyenne des 30 dernières minutes). Absent.
- [ ] **Enregistrer « Je travaille à Saint-Roch » et les jours** (une seule fois) : aujourd'hui en mémoire seulement. Ajouter des colonnes sur `users` ou une petite table.
- [ ] **Enregistrer les offres du midi** : elles disparaissent au rechargement. Les publier via F3 (type « offre du midi »), comme le demande la spec.
- [ ] **Réservations de place** (tables, pauses) en mémoire seulement : à enregistrer si on veut un compteur partagé.
- [ ] Brancher les points F6 : +10 par utilisation chez un commerce (code ou QR en caisse, simulé).
