# Décisions

| Sujet | Choix | Motif |
|---|---|---|
| Préfixe marchand | Conserver /dashboard et migrer les liens profonds | /admin dessert les opérateurs AXSO. |
| Illustration | Employer les illustrations du prototype dans l’admin et réserver les photos aux contenus marchands appropriés | La section 4.3 fixe le style du fil et des états vides. |
| Indicateurs | Afficher les données tenant et isoler les exemples en recette | La référence contient des valeurs de démonstration. |
| Dépendances | Utiliser les bibliothèques installées et une police Inter locale | Le build dépendait d’une requête Google Fonts. |
| Navigation | Garder le kiosque POS et les permissions de palier | La refonte doit conserver les parcours des équipes. |
| Portée des tokens | Variables définies sur `.ax-admin` (racine du shell marchand), pas sur `:root` | Les vitrines et le back-office plateforme gardent leur présentation. Effet voulu : dans l’admin, les classes Tailwind `rounded-*` lisent les rayons du §3.3 (plus de coins > 16px). |
| Préfixe CSS | Classes du design system en `axd-*` | `ax-*` est déjà utilisé par l’existant (`.ax-btn`, `.ax-card`…). |
| Police | `--font-sans` et `--font-poppins` pointent sur Inter dans `.ax-admin` | Les styles hérités lisent ces variables ; tout l’admin passe en Inter (§4.1). |
| Sidebar : routes | Les items pointent sur les routes existantes (`/dashboard/commandes`, `/dashboard/produits`…). Les URL du §6 viendront avec chaque écran refondu. | Aucun lien mort pendant la transition. |
| Sidebar : Marchés, Facebook & Instagram | Items non affichés tant que les écrans n’existent pas (lots 13 et 14) | Un item qui mène à une page vide dégrade la confiance. |
| Sidebar : modules AXSO | AXIA, Caisse & magasin, Finance et AXSO Sourcing deviennent des applications installées sous « Applications › ». Studio, Planificateur, Import magique, Veille, Réseau, Badges et Assistance sont dans la modale « Applis ». | Le §5.2 fixe la structure principale ; ces modules n’y ont pas de place mais doivent rester accessibles aux mêmes rôles. |
| Sidebar : Stock, Bons de commande, Transferts | Rattachés à Produits (§6) bien qu’ils vivent sous /dashboard/pos | Structure cible du §6. |
| Compteur Commandes | Commandes au statut `en_attente` ou `confirmee` | Équivalent de « non traitées ». Masqué à 0. |
| Section verrouillée par le palier | Visible avec cadenas, ouvre l’offre ; si un sous-item est accessible, le titre y mène | Comportement existant conservé. |
| Panneau AXIA | Réutilise `AxiaBulle` (API `/api/ai/axia`, propositions, accords) restylé en panneau latéral 400px ; ouvert par l’évènement `axia:assister` (dock, barre mobile), `detail.question` envoyée directement | Pas de mock : l’API existe déjà. |
| Dock AXIA | Remplace le bouton rond ; masqué sur /dashboard/accueil, /dashboard (AXIA plein écran) et les écrans plein cadre | §8.1 et §10. |
| Barre du bas mobile | Supprimée au profit de la barre supérieure noire + tiroir | §13.3. |
| En-tête global | Supprimé ; notifications, menu du compte, langue, déconnexion et lien vers la boutique passent dans la puce boutique de la sidebar | §5.2 : pas de barre supérieure en desktop. |
| Recherche | Palette de commandes unique (`CommandPalette`) branchée sur `/api/recherche` ; récents en localStorage | §11. |
| Accueil | Seulement la barre de KPI, la salutation, le champ AXIA, les chips et le fil (§8.1). Les analyses détaillées de l’ancien accueil relèvent d’Analyses de données. | Fidélité à la vidéo et au §8.1. |
| Fil de l’accueil | Cartes basées sur des fonctions existantes (domaine, livraison, WhatsApp, affiliation, insights calculés sur les vraies ventes et visites). Pas de carte « Activer Mobile Money » ni « frais offerts ». | Le paiement en ligne a été retiré (commit 3f8cc12) ; aucune promesse non tenue. |
| Chip « Relancer les paniers » | Masquée | Aucun modèle de panier abandonné en base. |
| Bannière promo de lancement | Bandeau d’information sur l’Accueil seulement | Absente de la vidéo sur les autres écrans ; l’information reste visible au premier écran. |
| Paramètres | Sidebar dédiée sur Général, Forfait, Utilisateurs, Expédition, Emplacements, Applications, Domaines, Événements clients, Notifications, Mon compte. Les autres sections du §9.2 attendent leurs écrans. | Pas de lien vers des pages inexistantes. |
| Écrans non refondus | Couche `legacy.css` (tokens, couleur de marque neutralisée) en attendant leur refonte | Écarts visuels réduits partout tout de suite. |
| Produits : vues | Tous · Actifs · Brouillon · Stock bas | « Archivé » n’existe pas en base ; « Stock bas » remplace l’ancien filtre « Stock faible ». |
| Logotype | Nouveau symbole + nom « axso » de l’ancien logotype (lettres géométriques, « x » jaune) | Le nom fait partie de l’identité déjà connue ; seul le symbole a été remplacé. |
| Croissance : « Autopilot » | Remplacé par un bandeau qui ouvre une demande réelle à AXIA | Aucune fonction de campagnes automatiques n’existe ; pas de promesse non tenue. |
| Chronologie de commande | Reconstruite à partir des dates enregistrées (création, expédition, livraison, échec, remise COD) | Pas de journal d’événements en base ; aucun événement inventé. |
| Logo AXIA sur fond sombre | Variante à coiffure bleu très clair, générée à partir du logo fourni | Sur fond noir, la coiffure bleu nuit disparaît ; demandé par le propriétaire. |
| Logos tiers | Logos officiels : Orange Money, MoMo from MTN et Google fournis par le propriétaire ; WhatsApp, Facebook, Instagram, TikTok via Simple Icons (CC0) | Demandé par le propriétaire ; usage descriptif des moyens de paiement et canaux. Détail dans `public/brand/README.md`. |
| Police du site public | Inter | La police de la référence est propriétaire ; Inter est déjà utilisée par l’admin. |
| Préchargeur de la landing | Retiré de l’accueil | Absent de la référence ; affichage immédiat du hero. |
| Logos Orange Money et MoMo | Posés sur une tuile sombre (`.axm-partner--sombre`) | Texte blanc (Orange Money) et jaune (MoMo) illisibles sur blanc ; aucune modification des logos eux-mêmes. |
| Témoignages | Seuls les avis vérifiés en base (`avisPublies`) sont affichés ; état vide sinon | Les neuf témoignages codés en dur (noms, boutiques, Wave, dropshipping AliExpress…) étaient fictifs mais présentés comme réels. |
| Tarifs : comparatif Shopify / WooCommerce | Remplacé par « Inclus dans tous les forfaits » | Affirmations non sourcées sur des concurrents et identité tierce (MASTERPROMPT) ; le contenu AXSO est conservé. |
| Affiliation : chiffres | Masqués tant que le catalogue est vide | « 0 boutique / 0 produit / 0 % » desservait la page. |
| Mobile Money sur le site | Formulé « à la livraison » uniquement ; la carte Tarifs ne promet pas de paiement d’abonnement en ligne | Le paiement en ligne des commandes et des abonnements est indisponible (FAQ, /legal/abonnements §2, commit 3f8cc12). |
| Pages ressources à venir | Blog, tutoriels, docs, communauté : sujets annoncés avec étiquette « À paraître » / « Bientôt » | Aucun contenu inventé ; même promesse qu’avant. |
| Genuka | Retiré de l’interface et du serveur (envoi, webhook, route connecteur, intégrations) ; l’envoi automatique passe par la Cloud API Meta, sinon lien wa.me | Demandé par le propriétaire. Les boutiques qui étaient connectées via Genuka repassent sur Meta (si configuré) ou le lien wa.me. |
| Logos des plateformes | Registre unique `LogoPlateforme` ; un logo ne se pose jamais sur un aplat de sa propre couleur (sélection = bordure noire) | Demandé par le propriétaire : vrai logo à chaque plateforme citée. |
| Pages légales | Mise en page document (fond clair, sommaire des textes) ; texte juridique inchangé | Lisibilité, charte publique. |
| Barre latérale | Rail de 60 px par défaut, ouverture au survol PAR-DESSUS le contenu (aucun décalage) ; bouton pour la garder ouverte (mémorisé) ; repasse en rail quand Stella est ouverte sous 1500 px | Demandé par le propriétaire (partage de l'écran avec le panneau Stella). |
| Panneau Stella | Ancré à droite à partir de 1000 px : le cadre lui réserve sa largeur (`--axia-width`), le contenu se resserre ; en dessous, il passe au-dessus | Partage de l'écran sans recouvrir le milieu. |
| Navigation du site public | Transparente en haut, cachée en descendant, revenue en remontant ; méga-menu pleine largeur avec carte « Démarrer » | Comportement des grandes plateformes, demandé par le propriétaire. |
| Écrans de compte | Carte blanche centrée sur fond sombre (`components/auth`), logique inchangée | Charte. |
| Store de thèmes | Admin : thème actuel, bibliothèque, store filtrable ; site : filtres par famille. Familles regroupant les ambiances (`lib/themes-familles.ts`) | Les 40 ambiances brutes (accords en double) faisaient trop de filtres. |
| Sous-pages non refondues | Alignées par `legacy.css` (couleur de marque en style inline et en classes, rayons, graisses, capitales, titres) ; contrôle automatique : 0 couleur de marque sur les 103 routes | Réécrire ~95 écrans un par un aurait pris des semaines ; la couche est retirée écran par écran au fil des refontes. |
| WhatsApp | Écran sombre passé en clair ; boutons verts → bouton principal noir ; bulles façon WhatsApp | Charte de l'admin. |
| AXIA → Stella | Renommage de tous les textes visibles, traductions et consignes de l'assistante ; identifiants techniques inchangés (routes `/dashboard/axia`, API, événements `axia:*`, modèles Prisma, fichiers `axia-mark`) | Demandé par le propriétaire ; renommer les identifiants casserait liens, données et sessions. |
| Sons | `public/sons/commande.mp3` (nouvelle commande, remplace `son-commande.mp3`) et `public/sons/notification.mp3` (toutes les autres notifications, remplace le carillon synthétique) ; un seul son pour plusieurs toasts rapprochés | Fichiers fournis par le propriétaire. |
| Espaces annexes | Espace affilié : cadre de l'admin ; suivi de colis et appli livreur : variante sombre (`components/ui/espace-sombre.css`, accents blancs) ; manifestes PWA renommés AXSO, icône 192 px ajoutée | « Même les applis » doivent suivre la charte. |
| Tutoriels et toasts | Modale du design system (`.axd-tuto`) ; toasts sombres en bas au centre, erreurs en rouge | Charte. |
| Étoiles d’avis | Jaune de marque | Illustration d’une note (usage autorisé hors action). |
| Caisse et magasin | Alignée par son kit UI (une seule source) plutôt qu’écran par écran | 55 composants partagent le kit ; garder les cibles tactiles de 44 px. |
| Analyse des produits Shopify | Seuls les vrais manques sont construits : vente en gros, marchés, outils gratuits. Le reste existait déjà (thèmes, domaines, caisse, promotions, retours, transferts, bons de commande, tests A/B, automatisations, comptes acheteurs) | Éviter les doublons ; structure seulement, aucune identité reprise. |
| Vente en gros | Paliers et règles de quantité par produit physique, recalculés côté serveur au checkout | Le navigateur n'est jamais source du prix. |
| Marchés | Se greffent sur la conversion visiteur existante (devise, taux, arrondi) ; encaissement en devise boutique | Un seul système d'affichage des prix. |
| Ajustement de prix par marché | Non proposé à l'écran | Il changerait le prix vu sans changer le montant encaissé ; à ouvrir seulement avec une tarification par marché appliquée à la commande. |
