# Releasit COD AXSO — journal des phases

## Phases 6 à 10 — Éditeur, abandons, conversions serveur, statistiques, durcissement (2026-11-26)

- **Éditeur** (onglet Formulaire) : 6 modèles, animation du bouton (pulsation, secousse, halo), ordre des champs par glisser-déposer ou flèches, libellés, champs affichés / obligatoires, jusqu'à 6 champs personnalisés (texte, liste, case) vérifiés côté serveur et affichés dans le centre de confirmation, titre, sous-titre, bouton et message de succès, aperçu en direct sur téléphone.
- **Mode hors-ligne** : réseau coupé, la commande reste sur l'appareil et part au retour de la connexion, avec la même clé (jamais de doublon).
- **Abandons** (onglet Abandons) : capture dès nom + téléphone (consentement affiché), relances WhatsApp automatiques à 1 à 3 délais (tâche toutes les 5 min), arrêt dès la commande, récupération et CA récupéré, relance ou appel en un geste.
- **Conversions serveur** (onglet Intégrations) : Meta Conversions API et TikTok Events API, même identifiant que le pixel (n° de commande), téléphone et nom hachés, jetons chiffrés jamais affichés, « Purchase » à la commande ou à la confirmation (le navigateur envoie alors un « Lead »), événement de test.
- **Statistiques** : entonnoir (fiches vues, formulaires ouverts, commandes, confirmées, livrées), CA commandé / encaissé, panier moyen, sources et villes, quota du forfait. **Test A/B** du texte du bouton : attribution stable par visiteur, taux, confiance, gagnant après 100 visites par variante.
- **Recommandations** à partir des ventes réelles (meilleure vente, achetés ensemble, article d'impulsion, code à la fermeture), pré-remplies dans l'éditeur d'offres.
- **Stella** : outils `releasit_a_confirmer`, `releasit_statistiques`, `releasit_diagnostic`, `releasit_suggestions`, `releasit_creer_offre_quantite` (validation du marchand).
- **Durcissement** : libellés reliés aux champs, focus gardé dans la fenêtre puis rendu, erreurs annoncées ; widget 9,7 Ko gzip ; vue d'ensemble avec la mise en route complète ; `PARITY-MATRIX.md` et `GUIDE-MARCHAND.md`.
- Migration `20261203090000_releasit_complet` (ajouts seulement) : `AbandonReleasit`, `StatReleasitJour`, colonnes de réglages et de commande. Tests : `tests/commande-express-phases-6-9.test.ts`.
- Restent : Google Sheets (projet Google Cloud), OTP (compte WhatsApp Business ou SMS), CSS personnalisé et formulaires par produit, prépaiement Mobile Money dans le formulaire, tourniquet des agents, réputation partagée.

## Phase 4 — Offres (2026-11-26)

- Le module s'appelle désormais **Releasit COD AXSO** partout (menu, pages, guides, anglais) ; les adresses internes `/dashboard/commande-express` ne changent pas.
- **Offre de quantité** : paliers « 1 / 2 / 3 » avec libellé, badge (« Le plus populaire »), prix barré et économie affichée. Les paliers sont écrits dans `Produit.venteGros` : la création de commande les applique côté serveur (aussi au panier classique).
- **Case à cocher** dans le formulaire : un produit ajouté d'un geste (garantie, emballage cadeau, 2e produit, livraison express créée comme produit), à son prix réel.
- **Ajout en 1 clic après la commande** : même commande, sans rien ressaisir, avec un jeton signé valable 30 min ; stock sorti pour la seule nouvelle ligne (`sortirStock(… ligneIds)`), totaux mis à jour, refus si la commande n'est plus « en attente ».
- **Offre à la fermeture** : si le client ferme sans commander, un code promo lui est proposé (une fois par visite) puis appliqué et revérifié par le serveur.
- Page **Offres** de l'application : création des 4 types, activation, modification, suppression, vues / acceptations / taux.
- Modèle `OffreReleasit`, migration `20261202090000_offres_releasit` (ajout seulement). Tests : `tests/commande-express-offres.test.ts`. Widget : 7,7 Ko gzip.

## Référencement des boutiques (2026-11-26)

- Chaque boutique a **son propre plan du site** (`/sitemap.xml` sur son adresse : accueil, produits avec image, collections, catalogue, pages publiées, à propos, contact) et **son propre robots.txt** (pages privées exclues, lien vers son plan du site).
- Titres au nom de la boutique (sans « | AXSO »), descriptions propres (sans HTML, 160 caractères), **adresse canonique**, Open Graph et Twitter complets.
- **Données structurées** : `Product` + `Offer` (prix, devise, stock), note moyenne des avis, fil d'Ariane, `OnlineStore` + `WebSite` pour la boutique.
- Pages privées (panier, paiement, compte, suivi, facture…) en `noindex`.

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

- Releasit COD AXSO devient une **application** de la sidebar (groupe « Applications ») avec ses pages : Vue d'ensemble, Confirmation. Sur mobile : onglet Ventes → Releasit COD AXSO, Confirmation.
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
