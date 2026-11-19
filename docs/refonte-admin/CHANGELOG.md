# Changelog — refonte de l'admin marchand

## Lot 6 — Accueil (`/dashboard/demarrer`)
- Fait : barre d'indicateurs (Visites, Ventes totales si droit finance, Commandes, Taux de conversion ; variation et mini-courbe ; période `?periode=`), « Bonjour {prénom} ! », champ AXIA (Entrée → panneau AXIA, accès selon le plan géré par le panneau, D13), chips « À traiter » (vrais compteurs, masquées à 0, filtrées par droits), bannière « pas encore publiée » + Publier, jauge et badge de complétude, fil des 7 étapes B4 (vignettes, état réel), étapes terminées repliées, info paiements (D3).
- Requêtes partagées avec le Tableau de bord : `accueil/donnees.ts` (période, compteurs) et `accueil/a-traiter.ts` (règle pure, `tests/adm-accueil.test.ts`).
- Le Tableau de bord (`/dashboard/accueil`) reste en place avec ses blocs B7 (lien « Voir le tableau de bord »).
- Non fait, faute de donnée réelle (D4/D5) : menu canal, visiteurs en direct, cartes « insight » chiffrées, cartes Mobile Money / applications / 100 premières ventes, ✕ de masquage (aucune carte de recommandation pour l'instant), boutons Récents / + / micro du champ AXIA.

## Lot 7 — Commandes
- **Fait** : `/dashboard/commandes` en PageHeader + MetricsStrip + IndexFilters + IndexTable (vues = statuts, recherche n°/client/téléphone/e-mail, filtres statut du paiement et moyen de paiement, tri date/total/client, colonnes masquables, pagination 50, tout dans l'URL). L'ancien `?statut=` est redirigé vers `?vue=` (liens existants intacts). Règles pures dans `commandes/filtres.ts` (`tests/adm-commandes.test.ts`).
- **Fiche** `/dashboard/commandes/[id]` en deux colonnes (§5.5) : cartes Traitement (lignes + actions de statut), Paiement (KeyValue des totaux), Livraison numérique, Chronologie ; à droite Note, Client (coordonnées, adresse, Google Maps), Livreur, Suivi colis, Suivi et livraison (GPS, facture, page de suivi, QR et partage WhatsApp au livreur). `StatutCommandeSelector` passé au kit adm. `CommandesExport` supprimé : l'export est dans l'en-tête de la liste.
- **Métriques** : 30 jours avec variation réelle vs 30 jours précédents (null si période précédente vide), livrées, en livraison, à traiter. Pas de sparkline (série quotidienne non calculée).
- **Non fait (chantier, D5 b)** : création de commande, actions groupées (marquer traitées/payées, imprimer, étiquettes, archiver : pas d'API groupée), étiquettes, canal, risque, flèches précédent/suivant, commentaire dans la chronologie, « lien MoMo » (D3). `factures` et `retours` sont des redirections vers `logistique` (lot de la logistique).
