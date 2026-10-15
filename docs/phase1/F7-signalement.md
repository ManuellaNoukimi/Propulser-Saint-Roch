# F7 — Signalement (P1, version simple, problème 6)

**État : 🟡 Parcours A partiel, parcours B absent**

Fichiers : `src/components/ReportMap.tsx`, `src/app/signaler/page.tsx`, `src/app/api/reports/`, `src/lib/reports.ts`, `src/lib/moderation.ts`, `src/lib/geo.ts`, `src/lib/saint-roch-boundary.ts`, `src/lib/constants.ts` (`REPORT_*`)

Le code actuel suit un autre modèle que la spec : « un besoin » (ce qui manque : épicerie, toilettes…) ou « un problème » (ce qui ne va pas), au lieu des deux parcours « une rue ou un lieu » et « une personne a besoin d'aide ».

## Fait

- [x] Carte limitée au quartier Saint-Roch (limite officielle), refus des signalements hors zone.
- [x] Recherche d'adresse, bouton « Ma position » (GPS), pastille placée en glissant la carte, adresse affichée en direct.
- [x] Catégories de problèmes : manque de lumière, saleté / déchets, vol / vandalisme, sentiment d'insécurité, trottoir / chaussée, chantier, bruit, graffiti, autre.
- [x] Moment (jour, soir, nuit, tout le temps), description, jusqu'à 3 photos.
- [x] Photos et signalements **privés** : chaque personne ne voit que les siens ; photos servies seulement à l'auteur.
- [x] Numéro de suivi façon 311 (ex. SR-4F2A9C) et statut « Reçu ».
- [x] Retrait de son propre signalement (photos effacées).
- [x] Modération du texte, consigne « on signale des lieux, jamais des personnes ».
- [x] Mention « Urgence ou danger immédiat ? Compose le 911 ».

## Reste à faire

### Parcours A : une rue ou un lieu
- [ ] Aligner les catégories sur la spec : déchets, graffiti, **mobilier brisé**, **lampadaire éteint**, **seringue ou objet dangereux** (absent). Aujourd'hui, mobilier et lumière sont couverts de loin par « Bancs / mobilier » (rangé dans les besoins) et « Manque de lumière ».
- [ ] Rappeler « photo de l'objet seulement » dans le formulaire.
- [ ] **Acheminement selon la catégorie (simulé, et dit comme tel)** :
  - propreté courante → Brigade propreté St-Roch (SDC) et entretien municipal du centre-ville ;
  - lampadaire, mobilier, chaussée → 311 de la Ville ;
  - seringue ou objet dangereux → canal distinct, avec la consigne « n'y touche pas ».
- [ ] **Suivi de statut** : Reçu → Pris en charge → Réglé (colonne `status` sur `reports`, avancement simulé ou bouton côté SDC).
- [ ] **Tableau de bord SDC** : signalements de saleté par heure et par endroit, points sales récurrents avant 8 h.

### Parcours B : une personne a besoin d'aide (absent)
- [ ] Choix d'entrée : « Une rue ou un lieu » / « Une personne a besoin d'aide ».
- [ ] Premier écran : « Y a-t-il un danger immédiat ? (violence, blessure grave, personne inconsciente) ». Si oui : gros bouton **911** (`tel:911`).
- [ ] Sinon : « en crise ou en détresse » ou « besoin de répit (repas, douche, repos) ».
- [ ] Acheminement simulé vers la bonne ressource (travailleurs de rue, centre de crise, Répit Basse-Ville, Lauberivière) avec adresse, endroit exact et courte description **de la situation**.
- [ ] Consignes pendant l'attente : ne pas intervenir seul, garder ses distances, rester calme. **À valider avec les organismes.**
- [ ] Profil d'entreprise (adresse, contact, accès) prérempli pour accélérer l'intervention.
- [ ] La page `/serein` est une page « Bientôt » : y brancher le parcours B, ou la retirer.

### Garde-fous à vérifier
- [ ] Pas de photo ni de description physique dans le parcours B (pas de champ photo du tout).
- [ ] Pas de carte publique des signalements de personnes ; visibles seulement par les services concernés.
- [ ] **Aucun point** pour les signalements de personnes (F6).
- [ ] Minimum de données : lieu et heure, sans compte public associé.
- [ ] Vocabulaire : « besoin d'aide », jamais « itinérant » ni « indésirable ». Vérifier que `moderation.ts` bloque ces termes.
- [ ] **Conflit de vocabulaire** : « Un besoin » (ce qui manque) se confond avec « besoin d'aide ». Renommer, ex. « Ce qui manque ici ».
- [ ] La catégorie « Sentiment d'insécurité » peut servir à signaler des personnes : la reformuler (ex. « Lieu peu rassurant ») ou la retirer.
- [ ] Afficher clairement que l'envoi au 311 et aux organismes est **simulé** (prochaine étape, pas une fonctionnalité existante).
- [ ] Mettre à jour la description « Signaler » dans `src/lib/features.ts`.
