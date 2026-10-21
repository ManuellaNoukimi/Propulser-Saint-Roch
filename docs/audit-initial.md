# Audit initial du dépôt

Audit du 21 octobre 2026, depuis `e36bbf7` (branche principale locale propre), avant modification. Une copie Git complète conserve les références, puis les changements se font sur `chore/recruiter-ready-repository`. Aucun fichier du projet original n'a été changé.

## Inventaire

346 fichiers suivis, dont 304 fichiers lisibles comme texte et 31 pages Next.js. Les imports `@/` résolvent vers des fichiers présents. Gestionnaire : npm, verrouillage `package-lock.json` v3. Next.js 16.4.1, React 19.3.0, TypeScript, Tailwind CSS 4, Zod, better-sqlite3, ExcelJS, Leaflet, MapLibre GL, lucide-react et qrcode.react. Les versions exactes transitives restent dans le verrouillage.

Les scripts initiaux sont dev, build, start, demo, reset-db et lint. Aucun script test, préparation de base ou exemple d'environnement. Les tests métier et HTTP existent déjà. `reset-db` efface tout le dossier data et ne doit pas être utilisé sur des données à conserver. Le README initial est le modèle create-next-app et ne décrit ni les données ni les comptes.

Les variables observées sont documentées dans `.env.example`. Les anciennes variables `COMPLICES_STRICT_AUTH` présentes dans certains tests ne pilotent plus le code d'authentification actuel. Aucun fichier .env personnel, base SQLite ou classeur n'est suivi au départ. Le contrôle par motifs courants n'a pas détecté de secret. Cela ne remplace pas un audit exhaustif ni une rotation si un secret a déjà été partagé ailleurs.

## État fonctionnel observé dans le code

Les idées, la participation, les espaces entreprise, les invitations, la Vitrine, la progression résident et la mobilité sont implémentés. Les signalements ont une page et des API, mais le bouton est retiré de la navigation et leur fiche fonctionnelle indique encore « bientôt ». Le README distingue cette incohérence d'une fonctionnalité totalement disponible depuis le menu.

Midi, Soirées, Saint-Roch serein, Bonnes nouvelles et Mon Saint-Roch affichent une page de présentation. Le profil F6 reste indépendant de cette dernière page. L'import social et certains mécanismes de présence sont simulés. Les fichiers privés d'événements et d'entreprises manquants entraînent des listes externes vides. Le routage peut utiliser des services publics ou un repli approximatif. La capacité d'un stationnement ne prouve pas le nombre de places libres.

## Structure et préservation

La structure src/app, components et lib est adaptée à Next.js. Aucun déplacement massif requis. Les anciens SVG next/vercel, l'aperçu mobile HTML et les scripts du hackathon sont conservés : leur faible coût ne justifie pas de supprimer des références d'équipe sans nécessité. Les documents de phase 1 sont des intentions historiques, pas une preuve de fonctionnalité livrée.

`AGENTS.md` référence CONSIGNES_IA.md et CONTEXTE_PROJET.md, absents du dépôt et du dossier parent inspecté. La documentation Next.js locale a été consultée. Aucun fichier manquant n'a été inventé.

## Attribution

L'historique principal comporte des contributions sous les identifiants publics ManuellaNoukimi, danny-abt et Stman24. Le commit `580ea43`, présent sur la référence locale Manuella, ajoute les vitrines, l'import SDC, les besoins géographiques, la progression résident et leurs tests/documentation sous l'identité ManuellaNoukimi. Le commit `16085a0` reprend le contenu de carte-3d sur main sans être une fusion de cette référence. L'historique complet est conservé. Les composants ont ensuite été modifiés par d'autres auteurs : la section « Ma contribution » parle de travaux attribuables au commit, pas d'une propriété exclusive du produit actuel.

## Risques et mesures ciblées

Dates de démo fixes devenues obsolètes : ajout d'un jeu indépendant à dates relatives. Pas de source de données confidentielles copiée. Authentification de hackathon et migrations anciennes potentiellement destructives : limites clairement documentées. Pas de licence ajoutée. L'installation propre, les tests, le linter, la compilation et l'inspection navigateur font l'objet du relevé dans qa-checklist.md, sans présenter une vérification non exécutée comme réussie.
