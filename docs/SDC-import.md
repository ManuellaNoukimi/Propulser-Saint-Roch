# Données SDC dans Vitrine

Le fichier fourni contient 386 lignes utiles : 315 fiches nommées et 71 lignes déclarées « Vacant ». Les deux lignes finales vides sont ignorées. Les répétitions de noms et les locaux anonymes sont conservés séparément : sans numéro civique, aucune déduplication fiable n'est possible.

Les seuls champs fournis sont le type et le nom de rue, le statut OBNL, la marque de commerce et l'activité. Aucun numéro civique, coordonnée, surface ni date d'observation n'est fourni. « Vacant » décrit le fichier ; il ne certifie pas une disponibilité aujourd'hui. La fermeture éventuelle d'un commerce trouvé sur Internet n'est pas transformée en vacance immobilière.

## Import local

Le classeur original est en lecture seule. `scripts/import-sdc.py` produit `data/sdc-import.json`, non versionné, puis `scripts/import-sdc.cjs` importe ce fichier dans SQLite. Ce dernier crée une sauvegarde SQLite complète `data/before-sdc-<timestamp>.db` avant l'import. Exécuter les scripts depuis la racine du dépôt. Le premier script exige Python avec `openpyxl` ; utiliser le Python fourni avec l'application lorsque nécessaire.

```powershell
python scripts/import-sdc.py "CHEMIN_DU_CLASSEUR.xlsx" --output data/sdc-import.json
node --conditions=react-server scripts/import-sdc.cjs data/sdc-import.json
```

Chaque import est identifié par le SHA-256 du classeur ; chaque ligne par l'import et son numéro Excel. Réimporter le même classeur ne duplique pas les locaux et ne réinitialise ni votes, ni demandes, ni localisations validées. Une nouvelle version reçoit un nouvel instantané, actif pour l'affichage ; les anciens votes et demandes restent dans la base, sans transfert arbitraire vers d'autres locaux. Les anciens exemples `v1`…`v5` restent conservés mais masqués lorsqu'un import SDC est actif.

Les tables ajoutées sont `sdc_imports` (provenance) et `sdc_members` (lignes, statut déclaré et localisation). Les locaux vacants sont liés à `vacancies` par `source_member_id`. L'ancien schéma impose des coordonnées non nulles : pour une localisation inconnue uniquement, `vacancies` stocke les sentinelles internes `0,0` avec `location_status='unverified'`. Elles ne sont jamais exposées comme coordonnées : l'API renvoie `lat: null, lng: null` et la carte ne les dessine pas. `sdc_members` conserve directement des valeurs nulles.

## Localisations et Google Maps

Trois fiches commerciales ont été vérifiées manuellement sur Google Maps : Boutique X20 (200 rue Saint-Joseph Est), Le Clocher Penché (203), Deux22 (222). L'adresse, le lien Google Maps, les coordonnées du lieu et la date de vérification sont conservés. Les autres fiches restent « localisation à confirmer ». Un lien de recherche Google Maps n'est pas présenté comme une localisation vérifiée.

Les locaux « Vacant » étant anonymes, aucun marqueur orange n'est inventé. La liste permet de choisir chacune des 71 lignes et d'utiliser sa fiche F4 (souhaits, fréquence, votes et demande d'occupation). Une demande peut être enregistrée, mais sa confirmation SDC est refusée tant que l'adresse exacte n'est pas vérifiée. Les surfaces restent « Surface non fournie ».

Pour importer des localisations vérifiées ultérieurement, passer `--locations fichier.json` au script Python. Le JSON est une liste d'objets `{ row, expectedName, address, lat, lng, googleMapsUrl, checkedAt }`. `row` est la ligne Excel, `expectedName` doit correspondre exactement à son nom, `checkedAt` est une date ISO. Seules les positions dans Saint-Roch et les URLs HTTPS Google Maps sont acceptées. Aucun appel payant Google Places, aucune clé ni extraction massive n'est ajouté.

## Affichage et vérification

`GET /api/sdc-members` fournit les fiches de l'instantané actif. `/api/vacancies` fournit uniquement les locaux vacants de cet instantané, avec leurs votes et demandes suivant les règles F4. La carte montre les positions vérifiées (bleu pour les établissements, orange pour les locaux vacants). La liste affiche les locaux sans position. L'annuaire permet une recherche par nom, rue et activité. Les fiches sont relues au chargement et au retour sur l'onglet.

Les données importées restent sous `data/`, ignoré par Git ; elles ne sont pas intégrées à des fichiers source ou publiées sur un hébergement. Tests sur bases temporaires :

```powershell
node --conditions=react-server --test tests/sdc-import.test.cjs tests/vacancies.test.cjs
node --conditions=react-server tests/vacancies-http.cjs
```

## Ajout du 15 oct. au soir (Danny, avec Claude) : locaux affichés dans l'app

- `/vitrines` a maintenant deux onglets (`src/components/VitrinesPage.tsx`) : **Locaux vacants** (`VitrinesView`, ouvert par défaut) et **Besoins des résidents** (`ResidentNeedsView`). Les deux écrans sont ceux de Manuella.
- Les locaux sans position vérifiée sont **regroupés par rue** sur la carte : une pastille orange au milieu de la rue dans Saint-Roch, avec le nombre de locaux (ex. 41 sur Saint-Joseph Est). Le point de la rue vient des adresses officielles de la Ville (`donnees-ouvertes/adresses-quebec.json`, données ouvertes) via `GET /api/rues-saint-roch` (`src/lib/saint-roch-streets.ts`). C'est la position de la **rue**, jamais l'adresse d'un local : aucune coordonnée n'est ajoutée aux locaux ni à `/api/vacancies`.
- Les deux cartes utilisent le fond commun de l'app (`src/lib/map-tiles.ts`) et restent bloquées sur Saint-Roch.
