# Commande Express AXSO — journal des phases

## Phase 2 — Centre de confirmation (2026-11-25)

- Commande Express devient une **application** de la sidebar (groupe « Applications ») avec ses pages : Vue d'ensemble, Confirmation. Sur mobile : onglet Ventes → Commande Express, Confirmation.
- **File d'appel** triée : rappels arrivés à l'heure, nouvelles commandes (risque, montant, ancienneté), injoignables (moins d'essais d'abord), rappels à venir.
- Fiche par client : bouton **Appeler** (`tel:` au format international), **WhatsApp** avec message de confirmation pré-rédigé, quartier, repère, position, source de la visite.
- Résultats en un geste : Confirmée, Injoignable (1/3, 2/3, 3/3 puis sortie de la file), À rappeler (dans 1 h, 3 h, demain 9 h), Annulée, Faux numéro ; note facultative ; historique des appels.
- La décision passe par le cycle de commande existant (`changerStatutCommande`) : confirmée → la commande part en préparation ; annulée/faux numéro → commande annulée tant qu'elle n'est pas expédiée.
- Chiffres 30 jours : à confirmer, taux de confirmation, taux de livraison après confirmation, appels du jour, activité par agent.
- Modèles : `AppelConfirmation` ; `CommandeExpress` + `tentatives`, `rappelA`, `noteConfirmation`, `confirmeeAt`. Migration `20261130090000_centre_confirmation` (ajouts seulement).
- Tests : `tests/commande-express-confirmation.test.ts` (effet d'un appel, file, ordre, statut de commande, validation).
- Reste pour plus tard : attribution automatique aux agents (tourniquet) et rôle « Agent de confirmation » dédié, scripts d'appel par produit, édition de la commande depuis la fiche (aujourd'hui : lien vers la commande).

## Phase 1 — Socle (2026-11-25)

- Formulaire 1 écran (popup + bouton collant mobile) sur les fiches de produits physiques, script autonome de 5,6 Ko gzip.
- Clé d'idempotence : un double envoi rejoue la même commande. Source capturée (UTM, fbclid, ttclid, gclid).
- Réglages et suivi dans le dashboard. Migration `20261129090000_commande_express`.
