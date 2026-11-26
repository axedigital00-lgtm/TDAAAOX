# Commande Express AXSO — journal des phases

## Phase 3 — Anti-fraude (2026-11-26)

- **Score de risque 0–100** calculé à chaque commande, avec la raison de chaque point : numéro déjà signalé faux (+45), refus ou annulation à la livraison (+25 à +40), téléphone au format inhabituel (+25), formulaire rempli en moins de 4 s (+30), envoi hors formulaire (+20), même numéro dans les 24 h (+15), 3 commandes ou plus depuis la même connexion (+20), nom inhabituel (+20), quantité > 10 (+15), client déjà livré (−20). Faible < 30, moyen < 60, élevé ≥ 60.
- Le score **ne refuse jamais** une commande : il remonte les clients à risque en tête du centre de confirmation, avec les raisons affichées.
- **Refus** seulement pour : champ piège rempli (robot), numéro ou connexion en **liste noire** (message neutre au client), **limite par jour** dépassée (par numéro et par connexion, 3 par défaut, réglable, 0 = sans limite).
- **Jeton anti-robot** signé (HMAC, 7 jours) glissé dans la configuration du formulaire ; **empreinte de connexion** (HMAC de l'IP) : l'adresse IP n'est jamais stockée ni affichée.
- Page **Anti-fraude** de l'application : limite par jour, liste noire (ajout d'un numéro, déblocage), commandes à risque des 30 jours. « Bloquer ce client » depuis le centre de confirmation bloque son numéro et sa connexion.
- Modèles : `ListeNoireCommande` ; `ReglagesCommandeExpress.limiteParJour` ; `CommandeExpress.telephone`, `ipHash`, `dureeRemplissage`. Migration `20261201090000_anti_fraude` (ajouts seulement).
- Tests : `tests/commande-express-risque.test.ts`. Widget : 5,7 Ko gzip.
- Reste : OTP par WhatsApp/SMS (compte WhatsApp Business d'AXSO ou Africa's Talking nécessaire), réputation partagée entre boutiques (option).

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
