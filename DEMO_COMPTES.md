# Comptes de démo (personnes et commerces FICTIFS)

Créés le 15 oct. 2026 au soir dans la base de **`complices-3d/data`** (le serveur du port 3000), à la demande de Danny,
par `node scripts/comptes-demo.mjs http://localhost:3000`. Pour les recréer ailleurs (base vide, autre dossier) : relancer
la même commande avec l'adresse du serveur. Un compte qui existe déjà est sauté.

**Mot de passe de tous les comptes : `demo2026`** · se connecter sur `/connexion` avec l'identifiant ci-dessous.

| Identifiant | Nom affiché | Type | Ce qu'il a publié |
|---|---|---|---|
| `sophie@demo` | Sophie Tremblay | Habitante | Fête des 7 ans de sa fille au parc Victoria (sam. 18 oct.) |
| `marc@demo` | Marc-André Gagnon | Habitant | Vide-grenier, aide pour installer les tables (ven. 17 oct.) |
| `amina@demo` | Camille Bergeron | Étudiante | Échange de plantes (19 oct.) · Groupe d'étude (22 oct.) |
| `julien@demo` | Julien Roy | Travailleur | Pétanque du midi sur le parvis (jeu. 16 oct., 12 h 05) |
| `nathalie@demo` | Nathalie Bouchard | Habitante | Corvée au parc des Pékans (18 oct.) · Aide déménagement (24 oct.) |
| `cafe@demo` | Café La Petite Pause | Commerce (café) | Soirée tricot (21 oct.) · Promo 2e café à moitié prix |
| `friperie@demo` | Friperie Le Grenier | Commerce (boutique) | Arrivage de manteaux · Offre d'emploi |
| `studio@demo` | Studio Pixel Basse-Ville | Entreprise (tech) | Atelier jeu vidéo ados (24 oct.) · Salle prêtée aux organismes |
| `entraide@demo` | Entraide Basse-Ville | Organisme | Bénévoles soupe du samedi (17 oct.) · Collecte de manteaux (20 oct.) |
| `sdc@demo` | SDC Saint-Roch | Organisme · **compte SDC** | Accès à la **Vue SDC** (`/sdc/vitrines`) : demande par local, vérification d'adresse, confirmation des occupations. Autorisé par `COMPLICES_SDC_USER_IDS` dans `.env.local` (créé le 16 oct., 0 h). |

⚠️ Les publications des **résident·e·s** (habitant, étudiant, travailleur) sont **effacées 6 h après le début** de l'activité
(règle de l'app). La pétanque du 16 oct. disparaîtra donc le 16 au soir.

## Interactions entre les comptes (16 oct., ~0 h 45)

`node scripts/interactions-demo.mjs http://localhost:3000` fait agir les comptes ci-dessus par les vraies routes de l'app
(relançable : les doublons sont ignorés). Résultat dans la base de `complices-3d` :
- **40 complices** sur les 11 activités (participants, bénévoles, matériel, lieu, commandite, expertise), avec un petit message ;
- **6 invitations** d'organisateurs vers des commerces et organismes : 2 acceptées, 1 refusée, 3 en attente
  (Friperie, Studio Pixel, Friperie → visibles dans leur tableau de bord) ;
- **7 messages** « Contacter » entre Café, Entraide, Studio, Friperie et la SDC (avec réponses) ;
- **11 votes** « Ce que je veux ici » et **3 demandes d'occupation** de locaux vacants (visibles dans la Vue SDC) ;
- **3 besoins des résidents** (épicerie, garderie, librairie) et **5 soutiens** « Moi aussi ».
