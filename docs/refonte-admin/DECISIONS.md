# Décisions — refonte de l'admin marchand AXSO

Chaque écart entre le masterprompt (`MASTERPROMPT.md`) et la réalité du produit Axso est tranché ici : contexte, option retenue, raison. Statut : **Retenue** (appliquée sans autre validation, elle découle d'une règle déjà validée par le fondateur) ou **À valider** (change l'expérience ou le périmètre : rien n'est codé avant le feu vert).

Ordre de priorité appliqué quand deux règles se contredisent :
1. les règles métier et les décisions déjà validées par le fondateur pour Axso (paiements, plans, données réelles, inscription, AXIA) ;
2. le masterprompt pour le comportement, le prototype pour le visuel ;
3. le design system actuel d'Axso (lot 2 du 18/11) pour tout ce que le masterprompt ne précise pas.

---

## D1 — Préfixe des routes : `/dashboard`, pas `/admin` · Retenue
- **Contexte** : le masterprompt place le back-office marchand sous `/admin`. Dans Axso, `/admin` est déjà le Command Center (superadmin), et l'espace marchand vit sous `/dashboard`, avec des liens partout (e-mails, notifications push, WhatsApp, Axia, sous-domaines).
- **Option** : l'admin marchand reste sous `/dashboard`. Toute route `/admin/x` du masterprompt devient `/dashboard/x`. Le Command Center n'est pas concerné par cette refonte.
- **Raison** : changer de préfixe casserait les liens existants et créerait une collision avec le superadmin.

## D2 — Noms des routes : on garde les chemins français existants · Retenue
- **Contexte** : le masterprompt utilise des chemins anglais (`orders`, `products`, `draft_orders`…) ; Axso a des chemins français (`commandes`, `produits`…) référencés par Axia (`lib/axia/pages.ts`), la recherche (`lib/recherche-dashboard.ts`), les e-mails et les relances.
- **Option** : les routes existantes gardent leur chemin. Les nouvelles routes suivent la même convention française (`/dashboard/commandes/brouillons`, `/dashboard/produits/collections`…). La correspondance complète est dans `PLAN.md` §3.
- **Raison** : aucune URL cassée, cohérence avec l'existant, deep-links conservés.

## D3 — Paiements : seuls les moyens réellement disponibles · Retenue
- **Contexte** : le prototype affiche « Payé · MTN MoMo », « Payé · Orange Money », « Envoyer un lien MoMo », des frais de 1,5 %, des cartes bancaires et une carte « Activer Mobile Money ». Dans Axso aujourd'hui, NotchPay est retiré (commit 3f8cc12) : tout se paie à la livraison ou via WhatsApp, et Orange Money / MTN sont annoncés « Bientôt disponible » (décision B2/B4 du 17/11).
- **Option** : les statuts, badges, filtres et actions de paiement n'affichent que ce qui existe (paiement à la livraison, WhatsApp, et les anciens paiements en ligne pour l'historique). Mobile Money, cartes et Wave apparaissent dans Paramètres › Paiements avec le badge « Bientôt disponible », sans bouton d'activation actif. « Envoyer un lien MoMo » et la carte « Activer Mobile Money » ne sont pas affichés tant que le paiement n'est pas intégré. Le mapping des badges du §7.2 est conservé pour les valeurs qui existent.
- **Raison** : règle intangible « aucune fonctionnalité simulée, rien d'annoncé comme actif qui ne l'est pas ».

## D4 — Données fictives et mocks · Retenue
- **Contexte** : le masterprompt demande de mocker les données absentes de l'API. La règle Axso interdit toute fausse donnée, faux indicateur ou maquette présentée comme fonctionnelle.
- **Option** : les mocks typés servent uniquement au développement et à la page de recette `/dashboard/_ui` (désactivée en production). Côté marchand, un écran dont les données n'existent pas n'est pas affiché avec des chiffres inventés : il est soit masqué du menu, soit livré avec un état vide honnête, selon D5.
- **Raison** : les deux règles sont compatibles si les mocks ne quittent jamais l'environnement de développement.

## D5 — Fonctionnalités de la cible absentes d'Axso · À valider
- **Contexte** : le masterprompt décrit des écrans sans équivalent ni modèle de données dans Axso (liste exacte dans `PLAN.md` §5) : par exemple cartes-cadeaux, entreprises B2B, marchés et catalogues, déploiements, métaobjets, menus et blog, attribution marketing, Autopilot, vue en direct avec globe, taxes, agentique, application « Formulaire COD ».
- **Option proposée** : la refonte ne construit pas de nouvelles fonctionnalités métier. Ces écrans sont classés en trois groupes : (a) l'équivalent existe déjà dans Axso sous un autre nom et il est replacé dans la nouvelle structure ; (b) le besoin est utile au marché et demande une évolution back-end, il est listé comme chantier séparé et absent du menu en attendant ; (c) le besoin n'a pas de sens pour Axso et il est écarté. Aucun écran vide « pour faire comme Shopify ».
- **À valider** : la répartition (a)/(b)/(c) proposée dans `PLAN.md` §5.

## D6 — Fonctionnalités d'Axso absentes de la cible · Retenue
- **Contexte** : Axso a des modules que le prototype n'a pas : caisse (POS), logistique et livreurs, sourcing et fournisseurs, Mon argent (wallet, retraits, séquestre), affiliation, abonnement, constructeur de boutique, thèmes, Démarrer, avis, support, campagnes WhatsApp et SMS, chatbot, agents et contrôle IA, médias, gamification, objectifs.
- **Option** : aucun n'est supprimé (règle « aucune fonctionnalité retirée »). Chacun est rangé dans la nouvelle arborescence (proposition complète dans `PLAN.md` §3) : par exemple POS dans « Canaux de vente › Point de vente », logistique et livreurs sous Commandes, sourcing sous Produits, affiliation et campagnes sous Croissance, constructeur et thèmes sous « Boutique en ligne », Mon argent dans le pied de la barre latérale à côté de Paramètres.

## D7 — Accueil : fusion de « Démarrer » et du tableau de bord · À valider
- **Contexte** : le masterprompt définit un seul Accueil (barre de KPI, « Bonjour {prénom} ! », champ AXIA, chips d'actions, fil de recommandations) et pas de tableau de bord séparé. Axso a aujourd'hui deux pages : « Accueil » (ex-Démarrer, cartes d'étapes B4) et « Tableau de bord » (B7 : à traiter, ventes en cours, 20 derniers clients, top produits, Mon argent).
- **Option proposée** : une seule page Accueil au format du masterprompt.
  - Les chips reprennent « À traiter » (commandes à confirmer, à expédier, retours, ruptures, messages non lus), avec les vrais compteurs.
  - Le fil de recommandations reprend les 7 cartes d'étapes B4 (produit, constructeur, livraison, politiques, coordonnées, affiliés, domaine) avec leur vrai état, plus les recommandations calculées sur des données réelles. Les cartes « insight » chiffrées ne s'affichent que si les données existent.
  - Les blocs du tableau de bord B7 (ventes en cours, derniers clients, top produits, villes, Mon argent) passent dans « Analyses de données ».
  - Le bouton « Publier ma boutique » reste en tête tant que la boutique est en brouillon, et la jauge de complétude B10 reste visible.
- **Raison** : c'est exactement la logique « tâches + recommandations » de la référence, et elle évite deux pages d'accueil concurrentes.

## D8 — Bouton primaire noir, jaune réservé à la marque · Retenue
- **Contexte** : le design system du lot 2 (18/11) a fait du jaune Axso `#F5A623` la couleur primaire des boutons. Le masterprompt (§3.6) réserve le jaune `#EBA900` et le bleu nuit `#0A1A33` au logo, à l'avatar boutique, à l'icône AXIA et aux illustrations, et rend les boutons primaires noirs.
- **Option** : le masterprompt l'emporte. Les jetons `--ax-*` du lot 2 sont remappés sur les valeurs du §3 (primaire `#1a1a1a`, cadre `#0c0c0c`, etc.). Les composants de `components/ui` gardent leur API et changent seulement de valeurs, ce qui propage la refonte sans réécrire les pages.
- **Raison** : instruction la plus récente et la plus précise du fondateur ; le remappage des jetons limite le risque.

## D9 — Couleur de marque : `#EBA900` ou `#F5A623` · À valider
- **Contexte** : le prototype utilise `#EBA900` ; le site, les e-mails, le nouvel icône (chariot jaune du 18/11) et l'ancien design system utilisent un jaune proche de `#F5A623`.
- **Option proposée** : `#EBA900` dans l'admin, comme le prototype, puisque la marque n'y apparaît plus qu'en petites touches (logo, avatar, icône AXIA). Le site public et les e-mails ne changent pas.

## D10 — Police Inter au lieu de Poppins · Retenue
- **Contexte** : l'admin utilise Poppins ; le masterprompt impose Inter (§4.1).
- **Option** : Inter via `next/font` (auto-hébergée, `display: swap`, sous-ensemble latin) dans l'espace marchand uniquement. Le site public et les vitrines gardent leurs polices.

## D11 — Ton : vouvoiement · Retenue
- **Contexte** : le masterprompt (§14) impose le vouvoiement ; la Partie B (17/11) et une partie de l'admin tutoient (« Ta boutique est en ligne »).
- **Option** : vouvoiement partout dans l'admin marchand, appliqué écran par écran pendant la refonte (les dictionnaires anglais ne changent pas, « you » couvre les deux). Le tutoiement reste là où il est volontaire et hors admin (Axia dans le chat conserve son ton propre si le fondateur le souhaite : voir D14).

## D12 — Panneau AXIA : il pousse le contenu · Retenue
- **Contexte** : le masterprompt décrit un tiroir de 400 px qui se superpose au contenu, plus un dock flottant en bas. Le 18/11, le fondateur a demandé explicitement un panneau à droite qui libère toute la largeur sur toute la hauteur de l'écran, sans cacher le reste de la page.
- **Option** : le panneau garde le comportement demandé par le fondateur (colonne de 400 px qui pousse le contenu, pleine hauteur) avec le visuel du masterprompt (radius 14 px, `--shadow-drawer`, en-tête avatar + « AXIA » + ✕, bulles du §10). Le dock flottant « Travailler avec AXIA » est ajouté comme point d'entrée quand le panneau est fermé (masqué sur l'Accueil, qui a son propre champ AXIA). En mobile : panneau plein écran, comme les deux sources le prévoient.

## D13 — Accès à AXIA selon le plan · Retenue
- **Contexte** : le prototype montre AXIA accessible partout ; dans Axso, la conversation AXIA est réservée au Palier Pro et plus (règle métier existante), avec l'offre Pro affichée aux comptes Essentiel.
- **Option** : la règle d'accès est inchangée. Le champ AXIA de l'Accueil et le dock s'affichent pour tous, et ouvrent l'offre Pro pour un compte Essentiel (sauf pendant la promo de lancement, où tout le monde a l'Illimité).

## D14 — Nom et ton d'AXIA · À valider
- **Contexte** : AXIA tutoie aujourd'hui le marchand ; le masterprompt vouvoie partout.
- **Option proposée** : AXIA vouvoie aussi, pour un ton unique dans tout l'admin.

## D15 — Plans et forfaits · Retenue
- **Contexte** : le prototype montre « Démarrage / Croissance / Pro » à 5 000 / 15 000 / 35 000 FCFA. Axso a ses propres paliers (Essentiel, Pro, Illimité), son essai Illimité de 7 jours et sa promo de lancement.
- **Option** : Paramètres › Forfait affiche les vrais paliers, prix et règles d'Axso (`lib/plans.ts`, `lib/abonnement.ts`), au format visuel du prototype.

## D16 — Pays : celui de la boutique, pas seulement le Cameroun · Retenue
- **Contexte** : le prototype est centré sur le Cameroun (+237, Douala, TVA 19,25 %, fuseau Afrique/Douala). Axso sert plusieurs pays (Cameroun, Côte d'Ivoire, Sénégal, Mali, Bénin, Togo, Kenya, RDC…).
- **Option** : indicatif, fuseau horaire, devise, villes et exemples suivent le pays de la boutique (`Tenant.pays`, `Tenant.devise`), avec les helpers existants (`lib/devise-convert.ts`). Le Cameroun reste l'exemple des mocks de développement. Aucune taxe n'est calculée automatiquement : la section Taxes n'affiche que ce que le back-end gère réellement (voir D5).

## D17 — i18n : on garde le système existant · Retenue
- **Contexte** : le masterprompt mentionne `fr.json` / `en.json`. Axso utilise le texte français comme clé (`t("…")`) et des dictionnaires anglais par espace (`lib/i18n/en/*.json`).
- **Option** : système existant conservé ; chaque nouvelle chaîne reçoit sa traduction anglaise dans le dictionnaire de son espace ; un contrôle automatique des chaînes sans traduction est ajouté aux tests.

## D18 — Barre latérale repliable · Retenue
- **Contexte** : le 18/11, le fondateur a demandé une barre latérale repliable en icônes qui se déplie au survol. Le masterprompt prévoit le bouton « Réduire la barre latérale » sans préciser le mode replié.
- **Option** : le bouton du masterprompt replie la barre en mode icônes (environ 64 px) ; au survol, elle se déplie en surimpression. Le travail déjà engagé sur ce point (agent du 18/11) est conservé comme base du lot 5 (AppShell), puis remis aux mesures du §5.

## D19 — « Démarrer » devient « Accueil » · Retenue
- **Contexte** : demande du fondateur du 18/11, cohérente avec la cible (premier item « Accueil »).
- **Option** : l'entrée de menu s'appelle « Accueil ». Avec D7, la page Accueil du masterprompt remplace à terme la page Démarrer et le tableau de bord.

## D20 — Icône et logo · Retenue
- **Contexte** : le fondateur a fourni le 18/11 un nouvel icône (chariot jaune souriant) pour le site et la barre latérale ; le prototype embarque un ancien logo en base64.
- **Option** : la barre latérale utilise le nouvel icône (`public/icon-192.png`) en 26×26 suivi de « AXSO » (§5.2). Le logo embarqué dans le prototype n'est jamais repris dans le code de production.

## D21 — Command Center hors périmètre · Retenue
- **Contexte** : « admin » désigne dans le masterprompt le back-office des e-commerçants.
- **Option** : le Command Center (`/admin`, superadmin) garde son thème `.cc` et n'est pas refait dans ce chantier. Ses évolutions demandées le 18/11 (inscriptions, chiffre d'affaires) suivent leur propre lot.

## D22 — Commandes : statuts réels d'Axso · Retenue
- **Contexte** : le prototype sépare « Statut du paiement », « Statut du traitement » et l'état de livraison. Axso a un statut de commande unique (en attente, confirmée, en préparation, en livraison, livraison échouée, livrée, annulée) et un statut de paiement.
- **Option** : la colonne « Statut du traitement » reprend le statut de commande Axso, avec les libellés communs de `app/(dashboard)/dashboard/commandes/statuts.ts` et les tons du mapping §7.2 (« Livraison échouée » = critical, « Livrée » = success…). Aucun nouveau statut n'est créé.

## D23 — Les chemins existants ne bougent pas · Retenue
- **Contexte** : `PLAN.md` §3 proposait de déplacer des pages (ex. `logistique` sous `commandes/livraison`).
- **Option** : aucune page existante ne change d'URL. La nouvelle barre latérale regroupe les chemins actuels selon la structure cible ; seules les pages nouvelles reçoivent un chemin neuf (`clients/[id]`, `clients/segments`, sections de `parametres/*`…).
- **Raison** : zéro lien cassé (e-mails, push, Axia, recherche), zéro redirection à maintenir ; le deep-link du §6 reste respecté.

## D24 — Page de recette `/dashboard/recette-ui` · Retenue
- **Contexte** : dans l'App Router de Next 16, un dossier `_ui` est privé (exclu du routage).
- **Option** : la recette vit sous `/dashboard/recette-ui`, `notFound()` en production.

## D25 — Décisions « À valider » tranchées le 18/11 · Retenue
- Le fondateur a dit « Termine tout » : les options proposées sont appliquées. D5 selon `PLAN.md` §5 ; Autopilot = accueil de la section Agents ; Formulaire COD = application qui regroupe le mode d'achat et les champs de commande existants ; « Collections » est le libellé du menu pour les catégories produits ; D7 fusion de l'Accueil ; D9 `#EBA900` ; D14 AXIA vouvoie.

## D26 — Nouveau kit dans `components/ui/adm/`, noms du masterprompt · Retenue
- **Contexte** : le kit actuel (`Bouton`, `Badge`, `Champ`…, API française) sert 100+ fichiers, y compris les espaces affilié, livreur et Command Center. Changer son API ou son visuel global casserait ces espaces.
- **Option** : les composants du §7 sont créés dans `components/ui/adm/` avec les noms et l'API du masterprompt (`Button`, `Badge`, `Card`, `PageHeader`…), importés via `@/components/ui/adm`. L'ancien kit reste en place, remappé visuellement dans `.adm` (D8) ; chaque écran passe au nouveau kit lors de son lot, et l'ancien kit est supprimé au lot 15 quand plus aucun écran marchand ne l'utilise. Les icônes restent dans `components/ui/icones/` (`Icon`).
- **Raison** : aucune régression hors admin marchand, migration écran par écran (feature flag naturel).

## D27 — Une seule définition de « VIP » · Retenue (19/11, « réadaptes tout »)
- **Contexte** : trois règles coexistaient (liste clients : 5 commandes ou 100 000 FCFA ; segment e-mail : 2 × dépense moyenne ; SMS : autre).
- **Option** : une fonction unique `estVip` dans `lib/` utilisée partout (liste, fiche, segments, e-mail, SMS) : **au moins 5 commandes, ou une dépense au moins égale à 2 × la dépense moyenne des clients de la boutique**. Relative, elle marche dans toutes les devises (D16).

## D28 — Fonctions back-end de la refonte · Retenue (19/11)
- **Contexte** : le fondateur demande de « arranger toutes les fonctions côté backend » listées en D5 (b).
- **Option** : sont construites, sur le modèle Shopify adapté à Axso : commandes provisoires (prise de commande téléphone/WhatsApp → facture → conversion en commande), paniers abandonnés en liste, actions groupées (commandes, produits), statut « Archivé » des produits, vues enregistrées des listes, clients (création, import/export CSV, étiquettes, notes), cartes-cadeaux (émises par le marchand, utilisables au paiement de la vitrine), attribution UTM des commandes, séries quotidiennes et cohortes pour les analyses.
- **Restent écartés** : globe/vue en direct temps réel, file d'attente hors ligne, B2B, marchés, taxes automatiques (D5 c, D16).
- **Base de données** : chaque évolution = modification de `prisma/schema.prisma` + migration SQL écrite sans toucher à aucune base (`prisma migrate diff`), puis `prisma generate`. Aucune base distante n'est migrée par les agents : la mise en prod reste une décision du fondateur.
