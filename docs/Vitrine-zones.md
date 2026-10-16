# Vitrine — Zones libres

La sélection ouest/centre/est est remplacée par un centre choisi librement dans Saint-Roch et un rayon de 100 m à 1 km. L'utilisateur clique sur la carte, déplace le repère ou utilise explicitement sa position. Il peut ajuster le rayon, revenir à tout le quartier et modifier sa zone avant d'exprimer un besoin.

La position est arrondie à trois décimales côté navigateur et serveur avant stockage. La carte et l'API publient cette zone approximative, jamais la position GPS d'origine. Le centre doit être dans Saint-Roch ; le cercle peut en dépasser la limite. Les anciens secteurs ne restreignent plus ni les créations ni les filtres. Les besoins dont les zones se recoupent sont proposés comme besoins similaires ; les demandes identiques (catégorie, libellé normalisé, centre arrondi et rayon identiques) sont regroupées.

`POST /api/resident-needs` accepte désormais `radiusMeters`, entier de 100 à 1000 par pas de 50, avec une valeur par défaut de 300 pour les anciens clients. Les réponses utilisent `zone: {lat,lng,radiusMeters}` au lieu de `sector`.

La migration SQLite reconstruit uniquement la table des besoins dans une transaction pour retirer l'ancienne contrainte d'unicité par secteur. Les identifiants, auteurs, soutiens et compteurs journaliers sont conservés ; les anciens besoins prennent le centre approximatif de leur ancien secteur et un rayon de 300 m. Les clés étrangères sont vérifiées avant validation puis réactivées même en cas d'échec. Une sauvegarde locale `data/before-free-zones-<timestamp>.db` a été créée avant l'installation.

La gestion des soutiens, leur modification/retrait, la confidentialité des participants et la limite quotidienne restent celles du parcours résident. Les données SDC et réservations restent conservées.

Tests :

```powershell
node --conditions=react-server --test tests/resident-needs.test.cjs tests/resident-zones.test.cjs
node --conditions=react-server tests/resident-needs-http.cjs
```
