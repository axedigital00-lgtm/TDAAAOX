# Journal de la refonte

## Lots 2, 3 (base) et 5 — Tokens, composants de base, shell

**Fait**
- Tokens du §3 (`components/dashboard/design-system/tokens/tokens.css` + `tokens.ts`), Inter locale.
- Icônes : registre unique des paths du prototype (`icons/Icon.tsx`) + pictogramme AXIA.
- Illustrations : `ILL` et `art*` extraits tels quels du prototype (`illustrations/svg.ts`).
- Composants : Button / IconButton, Badge + mapping métier du §7.2, Card, Page, PageHeader (menu « ⋯ » mobile), Layout 2 colonnes, Modal / BottomSheet, Banner, EmptyState, Toggle, Field, Tabs, SettingsRow.
- Shell : cadre noir, sidebar 240px (§5.2), zone blanche arrondie qui défile seule, barre mobile noire + tiroir 290px (glissement, Échap, voile), palette Ctrl K, dock AXIA, panneau AXIA latéral, notifications et menu du compte dans la puce boutique.
- Supprimés : `Header.tsx`, `RechercheDashboard.tsx`, `MobileBottomNav.tsx`, surcharges CSS provisoires.

**Vérifié** : `tsc --noEmit` sans erreur, 303 tests unitaires au vert, compilation du serveur de dev sans erreur. En session marchande réelle : aucune erreur console, aucun débordement horizontal à 390px, captures 1376×860 et 390×844 dans `SCREENSHOTS/shell/` (sidebar, sous-items actifs, palette Ctrl K, panneau AXIA, barre mobile, tiroir).

**Écart corrigé** : anneau de focus bleu sur le champ de la palette et la saisie AXIA (absent du prototype).

**Restant**
- Lot 3 : Popover/Menu clavier, Tooltip, Toast (Sonner à restyler), Skeleton, Avatar, Thumbnail, Timeline, KeyValue ; page `/dashboard/_ui` ; tests unitaires des composants ; `COMPONENTS.md` à réécrire pour la nouvelle API.
- Lot 4 : IndexFilters, IndexTable, MetricsStrip, Charts.
- Lot 5 : bouton « Réduire la barre latérale », SettingsShell (§9.1), raccourcis G+lettre, J/K, `?`.
- Les écrans existants s’affichent dans le nouveau shell avec leur ancien contenu ; ils sont refondus à partir du lot 6.

**Dépendances back-end** : aucune.

## Lot 4 et écrans refondus (alignement sur la vidéo de référence)

**Fait**
- Lot 4 : IndexFilters (vues, recherche à 250 ms dans `?q=`, tri), IndexTable (sélection, actions groupées, ligne cliquable, pagination, liste condensée en mobile), MetricsStrip (période dans l'URL, définitions au survol, deltas, sparklines), graphiques SVG (courbe avec comparaison, anneau, barres horizontales, clé-valeur), formats de date et de nombre (§14, §16).
- Écrans refaits avec les données réelles : Accueil (§8.1), Commandes (§8.2), Produits (§8.6), Clients (§8.9), Réductions (§8.14), Analyses de données (§8.17).
- Paramètres : sidebar dédiée (§9.1) sur les pages de réglages existantes.
- Bannière promo : bandeau d'information sur l'Accueil seulement ; « Plus d’actions ⌄ » en desktop dans PageHeader ; correctif du bouton « ⋯ » mobile.
- Couche `legacy.css` : cartes, boutons, libellés, badges et champs des écrans non refondus alignés sur les tokens ; couleur de marque retirée des boutons, liens et focus.
- Supprimé : sous-sidebar Produits (`ProduitsSubSidebar.tsx`).

**Actions groupées branchées sur les API existantes** : statut de commande (`PATCH /api/commandes/[id]/statut`, transitions métier appliquées côté serveur), état produit (`PATCH /api/produits/[id]`).

**Vérifié** : `tsc` sans erreur, 303 tests au vert, captures en session réelle sans erreur console ni débordement à 390px (`SCREENSHOTS/ecrans/`).

**Restant (dans l'ordre de la vidéo)** : fiche commande, fiche produit, Croissance / Attribution / Autopilot / Campagnes, Contenu (fichiers, métaobjets, menus), Marchés, Rapports, Vue en direct, Boutique en ligne / thèmes / préférences, Agentique, WhatsApp, applications, contenu des sections de Paramètres, puis tous les écrans AXSO (caisse, finance, sourcing…).

## Fiches, Croissance, AXIA plein écran, nouveau logo

**Fait**
- Fiche commande (§8.3) : deux colonnes, badges, navigation précédente/suivante, chronologie reconstruite à partir des dates enregistrées, client (téléphone, WhatsApp), adresse, livreur (assignation, QR, envoi de la course), suivi. Composants métier existants conservés.
- Fiche produit (§8.7) : en-tête PageHeader, cartes et champs aux tokens, sélecteur de type sobre, barre d'enregistrement contextuelle (§7.10 : Ignorer / Enregistrer, Ctrl+S, confirmation avant de quitter). Logique d'édition inchangée.
- Croissance (§8.10) : bandeau AXIA, ventes générées par les codes promo et les affiliés sur 30 jours, commandes par canal, raccourcis campagnes / e-mails / SMS.
- AXIA plein écran : charte claire (fond blanc, bulles du panneau AXIA, champ de l'accueil, boutons noirs), sidebar du shell visible, historique et cloche en clair, bandeau promo compact en bannière d'information.
- Nouveau logo : symbole détouré (`public/brand/axso-mark.png`), logotypes clair et sombre (`logo.png`, `logo-dark.png`) avec le nom « axso » existant, icônes d'application, favicons, image de partage. Mêmes noms de fichiers : tous les écrans qui affichaient l'ancien logo affichent le nouveau. Source fournie conservée dans `public/brand/axso-mark-source.png`.

**Non vérifié en capture** : fiche commande (aucune commande dans la boutique de recette).
- Nouveau logo AXIA : détouré (`public/brand/axia-mark.png`, remplace aussi `public/axia-icon.png`) et variante « fond sombre » à coiffure claire (`axia-mark-dark.png`, yeux et sourire conservés). Utilisé par le pictogramme AXIA de l’admin (dock, panneau, plein écran, champ de l’accueil, barre mobile) et par les écrans qui affichaient l’ancienne icône (inscription, landing, mode vocal). Source conservée dans `public/brand/axia-mark-source.png`.

## Site public (structure des grandes plateformes de commerce)
- Nouvelle charte du site public (`components/marketing/site/site.css`, portée `.axm`) : fond noir, très grands titres, cartes, boutons en pilule, police Inter, apparition au défilement.
- Navigation commune avec menus déroulants (Pourquoi AXSO, Produits, Ressources, Tarifs) et menu mobile ; pied de page en quatre colonnes avec langue et mentions légales. Toutes les pages publiques en bénéficient.
- Accueil refait : hero à phrase tournante, mur des moyens de paiement et canaux (logos officiels), AXIA, plateforme, Afrique (drapeaux), cas d’usage, écosystème, paiement à la livraison, témoignage réel, démarrage en trois étapes.
- Nouvelle page `/tarifs` (forfaits et FAQ existants) ; liens `/#tarifs` redirigés.
- Pages publiques non refondues : typographie alignée (Inter, titres, pas de capitales espacées). Leur structure reste à refaire.

## Site public — pages intérieures

**Fait**
- Blocs communs `components/marketing/site/Blocs.tsx` (PageAxm, HeroPage, Section, Bloc texte + visuel, Coches, Faq, AppelFinal, CartesLiens, GrilleAVenir) et styles associés dans `site.css`.
- Réécrites dans la charte `.axm` : Fonctionnalités (piliers Vendre, Encaisser, Livrer, Développer, Gérer, AXIA), À propos, Thèmes (grille `GrilleThemes` refaite), Contact, Affiliation (données réelles inchangées), Témoignages (avis vérifiés uniquement), Blog, Tutoriels, Documentation, Communauté, Carrières, Presse (logos téléchargeables), Tarifs (forfaits, compteur de promo, FAQ).
- Logos officiels fournis par le propriétaire : `mtn-momo.png`, `orange-money.png`, `google.png` (anciens SVG supprimés).

**Vérifié** : `tsc --noEmit` sans erreur ; captures 1376 px et 390 px des 14 pages sans erreur console ni débordement horizontal.

**Restant** : pages légales (`/legal/*`), `/suivi`, écrans admin restants (Contenu, Rapports, Boutique en ligne, WhatsApp, applications, Paramètres, Livraisons), anciennes sections marketing non utilisées (`AxiaSection`, `ConstructeurSection`, etc.) à supprimer.

## Partage de l'écran, comptes, thèmes, alignement global, Stella

**Fait**
- Barre latérale en rail (survol, épinglage) et panneau Stella ancré qui partage l'écran (`DashboardShell`, `ds.css`).
- Navigation publique au défilement + méga-menu pleine largeur.
- Connexion, code, mot de passe oublié, invitation d'équipe, parcours d'inscription dans la charte.
- Thèmes : page admin façon store (thème actuel, bibliothèque, store filtrable), filtres sur /thèmes.
- `legacy.css` étendue ; WhatsApp en clair ; espace affilié ; suivi de colis et appli livreur ; manifestes PWA ; tutoriels ; toasts ; bandeau de notifications.
- Logos officiels (`components/brand/LogoPlateforme.tsx`, `public/brand/plateformes`), Genuka retiré de l'interface.
- Pages légales ; sons de notification ; AXIA renommée Stella.

**Vérifié** : `tsc` sans erreur, 303/303 tests ; balayage automatique des 103 routes du board (0 couleur de marque mal placée, aucune erreur JS, aucun débordement) ; captures des pages modifiées.

**Non vérifié visuellement** : appli livreur (pas de compte livreur de test), Command Center super-admin.

## Reconstruction page par page (design system)

**Fait** : Contenu (Fichiers, Médias), Rapports, Logistique (vue d'ensemble, Livraison et tarifs, colonnes de préparation, Livreurs et rémunération, Retours, Factures, Transporteurs, Encaissements à la livraison, Entrepôts), Collections, Avis clients, Croissance (Campagnes, Publicité, E-mails, SMS, Affiliation, Objectifs). Caisse et magasin : kit `components/pos/ui` aligné sur le design system (boutons, champs, badges, fenêtres, états) et 50 écrans nettoyés (couleur de marque, arrondis, capitales).

**Outils ajoutés** : `.axd-choix`, `.axd-chip`, `.axd-progress`, `.axd-kanban`, `.axd-media`, `.axd-livreur`, `.axd-etoiles`, `.axd-carte-lien` (ds.css) ; `.axd-heritage` pour un bloc encore hérité dans une page refondue (legacy.css).

**Genuka** : retiré du serveur (lib/genuka.ts, webhook, route connecteur, envoi dans lib/whatsapp.ts, intégrations, traductions).

## Produits numériques avancés — socle serveur

**Fait** : migration `20261120120000_produits_numeriques_avances` (ajouts seulement : 10 tables, nouveaux champs ; appliquée à la base locale) ; nouveaux types `service`, `abonnement`, `parcours` ; formations enrichies (objectifs, compétences, public, prérequis, bande-annonce, durée d'accès, cohortes, leçons PDF / intégration / projet, résumé, transcription, chapitres vidéo, grille d'évaluation, questions-réponses). `lib/numerique/` : créneaux (fuseaux, préavis, pause, congés), services (brief, réservation transactionnelle, livrables, révisions, messages, rappels), abonnements (prolongation sans perte, essai, grâce, rappel, expiration qui coupe les accès), parcours (ordre, certificat final). Livraison, révocation, accès apprenant et tâche planifiée branchés. API : création des nouveaux types, `PUT /api/produits/digitaux/[id]/reglages`. Tests : `tests/numerique.test.ts`.

**Reste** : routes client (`/api/service/[token]`, espace membre), questions-réponses par leçon, et toutes les interfaces (création service / abonnement / parcours, fiche formation, suivi prestataire, pages client).

