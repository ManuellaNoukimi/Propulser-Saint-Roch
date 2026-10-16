# Vitrine — Parcours résident

> Cette première version par secteurs a été remplacée par les zones libres : voir `Vitrine-zones.md` pour le fonctionnement actuel, la confidentialité et la migration.

La page `/vitrines` affiche les besoins des résidents par secteur. Les réservations, locaux SDC et publications commerciales sont masqués dans ce parcours. Leurs composants, API, tables et données restent conservés.

## Parcours

- « Exprimer un besoin » : connexion, sélection d'un secteur sur la carte ou dans la liste, catégorie de service, fréquence de visite, puis enregistrement.
- « Voir les besoins près de moi » : consultation publique, filtres par secteur et catégorie, classement par nombre de soutiens.
- Les besoins similaires du secteur apparaissent avant la création. Un besoin identique (même catégorie et même secteur, même libellé normalisé pour « autre ») est regroupé automatiquement.
- « Moi aussi » : un soutien par compte et par besoin, fréquence modifiable.
- « Mes contributions » : retrouver, modifier sa fréquence ou retirer son soutien. Pour changer de catégorie ou secteur, retirer puis exprimer le nouveau besoin. Retirer son soutien n'efface pas celui des voisins. Le dernier retrait supprime le besoin vide.

## Données et confidentialité

Migration additive dans `resident_needs`, `resident_need_supports` et `resident_need_activity`, sans changement de version ni suppression des tables existantes. Les positions précises ne sont pas stockées. Le navigateur réduit également la position GPS ou le clic à un secteur avant l'envoi du formulaire. Les trois secteurs ouest/centre/est sont des regroupements indicatifs, pas des limites administratives officielles. Le serveur valide les coordonnées d'entrée contre la limite officielle de Saint-Roch, puis les remplace par un identifiant de secteur.

La réponse publique contient le besoin, son secteur, le nombre de soutiens et les intentions de visites. Aucun identifiant d'auteur, liste de participants ou position précise n'est exposé. `mySupport` ne concerne que le visiteur connecté. La connexion reste celle du prototype : la règle concerne un compte, pas une identité civile vérifiée.

Trois nouveaux soutiens par jour civil québécois. Modifier ou retirer un soutien ne consomme pas un nouveau soutien. Les retraits n'effacent pas le compteur journalier, pour empêcher un contournement de la limite. La création et le soutien initial sont atomiques ; les doublons sont empêchés en base. « 3 fois et plus » est compté pour 3 ; « de temps en temps » pour 0 visite hebdomadaire. Ces chiffres sont des intentions, pas une estimation de rentabilité.

## API

- `GET /api/resident-needs` : besoins agrégés, soutien du visiteur et quota restant pour un compte connecté.
- `POST /api/resident-needs` : JSON `{ category, frequency, lat, lng, label? }`. `label` est requis pour `autre` ; les catégories usuelles ont un libellé fixe. Retour `{ id, created }`. Une création identique rejoint le besoin existant.
- `PUT /api/resident-needs/:id/support` : JSON `{ frequency }`, ajoute ou modifie uniquement le soutien du compte connecté.
- `DELETE /api/resident-needs/:id/support` : retire uniquement le soutien du compte connecté.

Les écritures requièrent une session ; l'identité vient du cookie, jamais du corps JSON. Validation stricte, modération des libellés libres, refus des points hors quartier, transactions SQLite immédiates et réponses sans cache. Aucun envoi de notification externe ni appel de géolocalisation sans clic explicite n'est ajouté.

## Vérifications

```powershell
node --conditions=react-server --test tests/resident-needs.test.cjs
node --conditions=react-server tests/resident-needs-http.cjs
```

Les tests créent des bases temporaires. Le test HTTP utilise son propre serveur et le cache `.next-test` ; ne pas le lancer avec un autre serveur utilisant ce cache. Les données SDC et les réservations ne sont pas converties artificiellement en besoins de résidents.
