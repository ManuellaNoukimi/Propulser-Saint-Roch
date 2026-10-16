# Profil et progression des résidents

Accessible depuis « Mon profil » (/moi). Le rôle RESIDENT correspond au type `habitant`, créé par l’option Résident·e de l’inscription. Les autres types, dont travailleur, étudiant, commerce, entreprise, organisme et administrateur, ne gagnent aucun point résident. Les profils entreprise conservent leur fonctionnement, sans score F6.

Le score permanent suit les actions enregistrées après l’installation : check-in simulé 10, aide confirmée 20, idée réunissant deux autres complices distincts 30, rejoindre une idée 15, vote vitrine ou soutien à un besoin 5, Midi simulé 10, réservation confirmée SDC 40, inscription d’un résident par invitation 10. Les signalements ne rapportent aucun point.

Plafond de 100 points par jour, dont 15 au maximum pour les votes/soutiens, selon la date à Québec. Le dernier gain peut être partiel. Chaque événement est consommé même lorsque le plafond est atteint ; il ne peut pas être rejoué le lendemain. Une participation est récompensée une seule fois par idée. Un retrait de soutien puis une recréation identique ne donnent pas de nouveaux points. Supprimer une publication ne supprime pas les points acquis.

Niveaux : Voisin 0, Complice 50, Complice de quartier 150, Pilier de Saint-Roch 400. Les cinq badges existants sont conservés, persistés au moment des actions et complétés par Bâtisseur d’idées, Ami des vitrines et Coup de main. Ami des vitrines demande trois contributions distinctes ; les badges déjà gagnés restent acquis. Le score n’est pas recalculé rétroactivement à partir des données de démonstration.

Historique des 50 dernières actions et score accessibles uniquement à la session connectée. Le profil public est désactivé par défaut. Après consentement explicite, /residents/[id] ne renvoie que le niveau et les badges. Aucun classement public, score, coordonnées ou historique de lieux sur cette page.

Check-in /checkin/[id] : QR local simulé, un check-in par activité et par personne, au maximum un par lieu normalisé et par jour. Il ne vérifie pas une présence physique. Midi : code MIDI-DEMO par défaut, remplaçable par COMPLICES_MIDI_CODE ; un usage par jour. À 100 points, carte exemple de 10 %, sans valeur en caisse ni paiement, sans déduction du score. Les offres réelles et leur financement par les commerces (F3) restent hors de ce périmètre résident.

L’organisateur confirme l’aide depuis son espace résident. Le simple fait de proposer une aide ne donne pas les 20 points de confirmation. L’invitation est un lien /inscription?ref=CODE ou un code facultatif à l’inscription d’un nouveau compte résident.

Migration additive sans changement de version destructive. Une sauvegarde before-f6-*.db précède l’intégration. Les comptes de démonstration utilisent l’authentification existante sans mot de passe : une authentification réelle reste nécessaire avant toute utilisation avec des récompenses réelles.

## Compléments pour la démonstration jury

`awardPoints` retourne le gain, le score fiable, le niveau et les nouveaux badges ; le wrapper numérique conserve la compatibilité des API F4. Les actions et les montants viennent exclusivement du serveur. `points` joue le rôle du journal `point_transactions` demandé : référence, action, résident, montant et date avec contrainte d’unicité.

Un composant de notifications résident réutilise les toasts existants. Après un succès (complice, invitation acceptée, besoin, vote, check-in, Midi ou création), il relit un résumé privé côté serveur pour afficher le gain réel et les éventuels déblocages. Les requêtes sont sérialisées ; aucun gain historique n’est annoncé à la connexion. Un retour à l’onglet actualise également les récompenses reçues via l’action d’un autre organisateur. Aucune notification F6 pour les autres types.

Parcours jury : connexion résident, Explorer, ouvrir une initiative d’un autre organisateur, devenir complice (+15), Mon profil, choisir une activité dans Check-in QR, enregistrer la simulation (+10), retourner au profil pour retrouver score, historique, niveau et progression. Les badges déjà issus des données de démo peuvent être présents avec un score de zéro : ils ne génèrent pas de points rétroactifs.

Après le hackathon : authentification vérifiée, contrôle de présence avec jetons organisateur, gestion d’offres partenaires réelles et prévention des inscriptions multiples. Aucun point n’est convertible automatiquement en argent.
