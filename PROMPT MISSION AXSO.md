# PROMPT — MISSION AXSO : AUDIT UX/UI + PARCOURS DE DÉMARRAGE DU MARCHAND

> Annexe de référence : `CAHIER DES CHARGES AUDIT.txt` (sections 1 à 24) — c'est la liste exhaustive des points à examiner. Ce prompt l'organise, la complète avec les nouvelles spécifications (Partie B) et fixe l'ordre de priorité.
> Toutes les décisions de la Partie B ont été validées par le fondateur le 17/11/2026. Tout nouveau point incertain se documente et se valide avant implémentation.

---

## 0. TON RÔLE

Tu es un expert senior en UX/UI, Product Design et e-commerce SaaS (référence : Shopify, Wix, Shopify POS, Stripe Dashboard). Tu travailles sur **Axso**, une plateforme e-commerce africaine existante (Next.js, Prisma, Neon), utilisée par des marchands **sans compétence technique**, souvent sur téléphone.

L'idée directrice de toute la mission :
**Un marchand qui s'inscrit doit trouver une boutique déjà prête, belle et cohérente avec ce qu'il vend, et savoir à chaque instant quelle est la prochaine chose à faire pour commencer à vendre.** Axia (l'IA d'Axso) fait le travail lourd en arrière-plan ; le marchand vérifie, ajuste et publie.

---

## 1. ORDRE DE PRIORITÉ DES RÈGLES

1. Les spécifications de la **Partie B** sont des demandes explicites du fondateur : elles priment sur les interdictions générales du cahier (« ne pas ajouter de fonctionnalité », « inscription strictement identique ») **uniquement pour ce qu'elles décrivent**.
2. Tout le reste suit les règles du cahier (Partie A).
3. En cas de doute sur une règle métier, une permission, un paiement ou une donnée : lire le code, puis documenter et demander validation avant de modifier.

---

## 2. RÈGLES INTANGIBLES

- Ne pas modifier : règles métier, calcul des commissions, paiements (NotchPay, COD), séquestre, règles de stock, attribution des livraisons, permissions, rôles, API existantes — sauf ce que la Partie B demande explicitement.
- Cinq rôles seulement : Marchand, Client, Affilié, Livreur, Superadmin (Command Center). Aucun nouveau rôle.
- Aucune fausse donnée, aucun faux avis, aucune statistique inventée, aucune maquette statique à la place d'un composant fonctionnel. Un indicateur n'est affiché que s'il est calculé à partir de données réelles.
- Axia n'invente jamais : prix, caractéristiques produit, délais, adresses, engagements commerciaux. Ce qu'il ne sait pas est signalé « à compléter » de façon visible pour le marchand (jamais publié tel quel côté client).
- Aucune fonctionnalité existante supprimée pour « simplifier » visuellement.
- Toutes les chaînes visibles passent par le système i18n existant (`tr` / `lib/i18n`).
- Mobile d'abord : chaque écran doit être pleinement utilisable à 360 px de large.

---

## 3. MÉTHODE DE TRAVAIL (OBLIGATOIRE)

Le fondateur valide **chaque lot avant implémentation** et veut le détail de chaque modification.

1. **Audit** : explorer le code (routes `app/`, layouts, `components/`, `lib/`, `prisma/schema.prisma`), cartographier toutes les pages par rôle (objectif, données, actions, états, problèmes).
2. **Diagnostic** présenté par lots : pour chaque problème → page, élément, problème, impact, modification proposée, résultat attendu.
3. **Feu vert** du fondateur sur le lot.
4. **Implémentation** du lot.
5. **Compte rendu** : fichiers modifiés + effet visible + vérifications faites (chargement, erreur, vide, mobile, permissions).
6. Tests permanents dans `tests/` (`npm test`) pour toute logique non triviale (calcul d'état d'une étape, conditions de publication, etc.). Aucun script jetable dans le dépôt.

Ordre des lots :
- **Lot 1** — Partie B (parcours de démarrage) : B1 → B2/B3 → B4 → B5 → B8 → B10 → B7 → B9 → B6 → B11.
- **Lot 2** — Design system global (cahier §4).
- **Lot 3** — Optimisation par espace : Marchand → Client → Affilié → Livreur → Superadmin, puis POS et Axia (cahier §8 à §15).
- **Lot 4** — Interactions, messages, responsive, vérifications fonctionnelles (cahier §16 à §23).

---

## PARTIE A — AUDIT ET OPTIMISATION UX/UI (résumé du cahier)

Examiner **chaque page, champ, bouton, texte, alerte et interaction** selon ces exigences (détail complet dans le cahier) :

- **Design system** (§4) : palette à usages fixes (primaire, secondaire, fond, carte, bordure, texte principal/secondaire, succès, avertissement, erreur, info) ; hiérarchie typographique unique ; espacements, rayons, ombres harmonisés ; un seul jeu d'icônes (lucide) ; pas de cartes imbriquées inutiles ni de décor sans information.
- **Structure de page** (§5) : titre qui dit où l'on est, description courte si utile, action principale visible sans chercher, actions destructrices distinguées ; pages similaires = structures similaires (listes, création, détail, suppression).
- **Formulaires et boutons** (§6) : libellé toujours visible (jamais placeholder seul), obligatoire/facultatif indiqué, erreurs en français clair près du champ, saisie conservée en cas d'échec ; boutons à libellé précis (« Enregistrer les modifications », pas « OK »), états hover/actif/désactivé/chargement ; confirmations nommant l'objet pour les actions destructrices seulement.
- **Tableaux et filtres** (§7) : colonnes claires, filtres actifs visibles et retirables, recherche, tri, pagination, version mobile sans perte d'action.
- **Espaces par rôle** (§8 à §14) : marchand (produits, commandes, stock, boutique, constructeur), POS (même catalogue et même stock que la boutique en ligne, rapidité de caisse), client (parcours d'achat sans ambiguïté), affilié (commissions générées / en attente / validées / payées lisibles), livreur (actions en un minimum de gestes, mobile), Command Center (supervision séparée des actions sensibles).
- **Axia** (§15) : toujours dire ce qu'il va faire, sur quoi, si c'est en cours, réussi, ou s'il faut une intervention humaine ; jamais présenter une suggestion comme faite ; aucune opération sensible silencieuse.
- **Messages** (§16) : succès qui dit ce qui a été fait, erreur qui dit quoi corriger, alerte = quoi / pourquoi / que faire, état vide = pourquoi + action.
- **Navigation** (§17), **responsive** (§18, tests spécifiques POS et livreur), **micro-interactions sobres** avec `prefers-reduced-motion` (§19), **vocabulaire unifié** (§20).
- **Critères de validation d'une page** : les 16 critères du §21.

---

## PARTIE B — NOUVELLES SPÉCIFICATIONS (PARCOURS DE DÉMARRAGE)

### Vue d'ensemble du parcours cible

```
Inscription (+ écran « Identité visuelle »)
   └─ Axia prépare toute la boutique en arrière-plan (template + textes + images + paiements + livraison + politiques)
        └─ ACCUEIL (nouvelle page « Démarrer ») : cartes des étapes restantes, état réel de chacune
             └─ Publier ma boutique (quand les conditions sont remplies)
                  └─ TABLEAU DE BORD (résultats : commandes, clients, ventes, à traiter)
```

Connexion : le marchand arrive sur **Accueil** tant que sa boutique est en brouillon (`Tenant.statut = "brouillon"`), sur le **Tableau de bord** dès qu'elle est publiée (`"active"`). Accueil reste accessible depuis le menu.

---

### B1. Inscription — écran « Identité visuelle » (charte du marchand)

**But** : qu'Axia construise la boutique avec la vraie charte du marchand dès le départ.

**Emplacement** : un seul écran, juste après le choix du design (étape `design`) et avant `identite` (prénom/WhatsApp). C'est la **seule** exception validée à la règle « inscription identique » : les autres étapes, leur ordre et leurs validations restent inchangés.

**Contenu de l'écran (tout est facultatif, une seule page) :**
1. **Logo** : zone d'import (PNG, JPG, SVG, WebP — max 5 Mo). Lien « Je n'ai pas de logo » → Axia utilise un logo texte (nom de la boutique dans la police choisie). Aucune génération d'image présentée comme un vrai logo.
2. **Couleurs** : dès que le logo est importé, extraction automatique de 2 couleurs (principale, secondaire) proposées en pastilles ; le marchand peut cliquer une pastille pour la changer (sélecteur de couleur natif + 6 suggestions). Sans logo : couleurs du design choisi.
3. **Police** : 3 associations titre/texte proposées par le design choisi, affichées en cartes « Aa » avec le nom de la boutique ; pas de liste de 100 polices.
4. **Aperçu téléphone en temps réel** : le composant `ApercuBoutique` existant se met à jour à chaque changement (logo placé dans l'en-tête, couleurs sur boutons et bandeaux, police sur les titres).
5. Bouton principal : « Continuer avec cette identité » ; lien secondaire : « Passer, Axia choisira pour moi ».

**Technique** : le logo est envoyé sur le Blob avant la création du compte (fichier temporaire), puis rattaché au `Tenant` (`logoUrl` existe déjà) à la création ; couleurs et polices stockées dans la configuration de thème existante. Tout reste modifiable ensuite dans le constructeur.

---

### B2. Préparation automatique de la boutique par Axia

À la fin de l'inscription, Axia prépare une boutique **publiable telle quelle**, à partir de : type (physique/digital), ce que vend le marchand, nom, pays, design, identité visuelle, WhatsApp.

Axia doit, sur **toutes les pages du template** (B3) :
- appliquer logo, couleurs, polices ;
- écrire tous les textes section par section avec un vrai copywriting adapté au secteur et au pays (titre d'accroche, sous-titre, boutons d'action, arguments, « à propos », FAQ, bandeau de réassurance), dans le ton du marché local, sans promesse inventée (pas de « livraison en 24 h » si aucun délai n'est connu) ;
- charger des **produits d'exemple liés à ce que vend le marchand** (déjà créés à l'inscription par `app/api/ai/onboarding/route.ts` : inactifs, stock 0) pour remplir la vitrine dans les aperçus et le constructeur, marqués « Exemple » côté marchand. **Ils ne sont jamais visibles des clients** (prix inventés, stock 0). Sur chaque exemple, une action « Activer ce produit » ouvre un formulaire court : le marchand vérifie prix, photo et stock, puis le produit devient un vrai produit actif. C'est le chemin le plus rapide vers la condition de publication « 1 produit actif » : la carte 1 de l'Accueil le propose en premier (« Activer un exemple d'Axia » ou « Ajouter un produit ») ;
- choisir des images cohérentes (banque d'images libre de droits ou génération), avec textes alternatifs ;
- placer les coordonnées (WhatsApp, pays/ville, e-mail) dans l'en-tête, le pied de page et la page Contact ;
- **moyens de paiement** : Orange Money, MTN Mobile Money, etc. sont proposés par Axso mais **pas encore intégrés** : les afficher comme « Bientôt disponible », ne rien simuler ; le paiement à la livraison reste tel qu'il est aujourd'hui ;
- proposer des **zones et tarifs de livraison** par défaut pour le pays (modifiables) — ignoré pour une boutique 100 % digitale ;
- rédiger les **politiques** (B5) ;
- **optimiser la boutique pour le pays du marchand** (quel qu'il soit ; le Cameroun n'est qu'un exemple) : devise, format et indicatif des numéros, villes principales dans les zones de livraison, moyens de paiement locaux annoncés, ton et références des textes adaptés au marché, langue.

Chaque élément préparé par Axia est marqué « Préparé par Axia » dans l'interface marchand, avec un lien pour le modifier. Si une étape échoue (IA indisponible), la boutique reste fonctionnelle avec les textes par défaut du template et l'Accueil indique ce qui reste à faire.

---

### B3. Templates de boutique (8 secteurs)

Remplacer les thèmes actuels par des **templates de vraies boutiques en ligne**, inspirés de Shopify (Dawn, Sense, Craft…) et des meilleures boutiques africaines, construits sur le moteur de thème React prévu (cf. décision du 12/11).

**Secteurs** : Mode, Beauté, Électronique, Alimentation, Maison, Numérique/formations, Bijoux, Généraliste/marché.

**Pages obligatoires de chaque template :**
Accueil · Catalogue/collection (filtres, tri) · Fiche produit (galerie, variantes, prix, stock, ajout au panier, achat direct) · Panier latéral + page panier · Commande · Confirmation de commande · Suivi de commande · À propos · Contact · FAQ · Politiques (livraison, retours et remboursements, confidentialité, conditions de vente) · Recherche · 404.

**Panier facultatif** (nouveau réglage, n'existe pas aujourd'hui) : dans le constructeur, réglage « Mode d'achat » :
- **Panier + commande** (par défaut) ;
- **Commande directe uniquement** : pas d'icône panier, pas de panier latéral ni de page panier ; chaque fiche produit garde le bouton « Commander maintenant » (formulaire existant `parametresCommande`).
Le choix s'applique à tout le template (en-tête, fiches, cartes produit) sans casser le parcours de commande ni les règles de stock.

Pour un template « Numérique/formations » : remplacer les pages de livraison par l'accès aux produits (téléchargement, espace formation).

Chaque template doit fonctionner avec le constructeur existant (sections modifiables, réordonnables) et passer les tests responsive. Les anciens thèmes sont supprimés **à la fin**, une fois les boutiques existantes migrées.

---

### B4. Nouvelle page « Accueil » (démarrage)

**But** : le marchand voit en un coup d'œil ce qui reste à faire pour vendre, et chaque carte l'emmène directement au bon endroit.

**En-tête** : « Bienvenue, {prénom} — {nom boutique} est presque prête » ; barre de progression « 2 étapes sur 6 » ; aperçu miniature de la boutique avec bouton « Voir ma boutique ».

**Deux niveaux d'étapes** :
- **Pour publier** (bloquant) : seulement « Ajouter mon premier produit » — les autres critères existants (nom, WhatsApp, pays, description) sont déjà remplis par l'inscription.
- **Pour bien vendre** (non bloquant, mais mis en avant avec insistance, cf. B10) : livraison, politiques, coordonnées, domaine, affiliés.

**Cartes** (une par étape, ordre ci-dessous). Chaque carte = icône, titre-action, une phrase, état, bouton. Trois états calculés **uniquement sur des données réelles** :
- **À faire** (gris) ;
- **Préparé par Axia — à vérifier** (couleur info) ;
- **Terminé** (vert, carte repliée en bas).

| # | Carte | Destination | Terminé quand |
|---|-------|-------------|---------------|
| # | Carte | Niveau | Destination | Terminé quand |
|---|-------|--------|-------------|---------------|
| 1 | Ajouter mon premier produit | **Pour publier** | `/dashboard/produits/nouveau` | ≥ 1 produit actif (critère existant de `lib/boutique-completion.ts`) |
| 2 | Construire ma boutique | Pour bien vendre | `/dashboard/builder` | constructeur ouvert et enregistré au moins une fois (sinon « Préparé par Axia ») |
| 3 | Configurer les zones de livraison | Pour bien vendre | `/dashboard/livraison` | ≥ 1 zone avec tarif confirmée par le marchand (masquée si boutique 100 % digitale) |
| 4 | Rédiger mes politiques | Pour bien vendre | page Politiques (B5) | les 4 politiques validées |
| 5 | Compléter mes coordonnées | Pour bien vendre | réglages de la boutique | ville/adresse, e-mail de contact et horaires renseignés (WhatsApp vient de l'inscription) |
| 6 | Recruter des affiliés | Pour bien vendre | `/dashboard/affiliation` | lien de recrutement d'affiliés copié ou partagé au moins une fois |
| 7 | Obtenir un nom de domaine | Facultatif | `/dashboard/parametres/domaine` | domaine personnalisé actif (`domaineActifAt`) |
| — | **Publier ma boutique** | action | action directe (B8) | `statut = "active"` |

**Paiements** : pas une carte d'étape. Encadré d'information : « Paiement à la livraison actif. Orange Money et MTN Mobile Money : bientôt disponibles. » Aucun faux état « configuré ».

La carte 6 renvoie au lien qui permet au marchand de **recruter des affiliés pour sa boutique** (pas au parrainage Axso) : bouton « Copier le lien » + « Partager sur WhatsApp » + message prérédigé par Axia.

**Axia** : une bulle en haut « Je peux t'aider à démarrer » qui propose la prochaine étape non terminée et ouvre le chat Axia existant avec le contexte de cette étape.

Les étapes terminées restent consultables. Quand tout est fait et la boutique publiée, la page affiche « Ta boutique est en ligne » et renvoie vers le Tableau de bord.

---

### B5. Page « Politiques de la boutique »

**Route proposée** : `/dashboard/boutique/politiques`.

**Mise en page** :
- Gauche (ou onglets sur mobile) : 4 politiques — Livraison · Retours et remboursements · Confidentialité · Conditions générales de vente. Chacune avec un badge d'état : « Brouillon d'Axia », « Validée », « À compléter ».
- Centre : éditeur de texte simple (titres, listes, gras) pré-rempli par Axia.
- Les passages qu'Axia ne peut pas connaître sont **surlignés en jaune** avec un libellé `[À compléter : délai de retour en jours]` ; la politique ne peut pas être validée tant qu'il en reste.
- Droite (desktop) : aperçu tel que le client le verra dans la boutique.
- Actions : « Valider cette politique » (principale), « Demander à Axia de réécrire » (avec consigne libre), « Revenir au brouillon d'Axia ».

**Ce qu'Axia utilise pour rédiger** (aucune invention) : type de produits (physique / digital / mixte), ce que vend le marchand, pays et devise, zones et tarifs de livraison configurés, moyens de paiement actifs (paiement à la livraison, mobile money), règles Axso réelles (remboursement via NotchPay, accès à vie aux produits digitaux, séquestre), coordonnées du marchand.

Les politiques validées s'affichent automatiquement dans les pages Politiques et le pied de page de la boutique.

---

### B6. Nom de domaine

**Ce qui existe déjà** (`lib/domaines.ts`, `app/api/domaine`, `/dashboard/parametres/domaine`) :
- sous-domaine automatique `nom.axsoafrica.com` pour chaque boutique (déclaré chez Vercel, actif en prod) ;
- connexion d'un domaine **déjà acheté ailleurs** : saisie du domaine → ajout au projet Vercel → affichage des enregistrements DNS à créer (A / CNAME / TXT, avec explication) → bouton « Vérifier » → le domaine devient l'adresse principale (`domaineActifAt`) ; suppression possible.
- **Aucun achat** de domaine ni aucune suggestion de nom n'existe.

**À ajouter** :
- **Proposition d'Axia** : 3 à 5 noms dérivés du nom de la boutique (`.com`, extension du pays : `.cm`, `.sn`, `.ci`…, `.shop`, `.store`), avec **disponibilité vérifiée** et **prix réel** (API Domains de Vercel), jamais de nom proposé sans vérification.
- **Achat** : pas d'achat dans Axso. Chaque nom proposé a un bouton « Acheter chez {fournisseur} » (lien externe vers la page du domaine chez le fournisseur choisi) puis un guide pas à pas sur la même page : 1. acheter le domaine, 2. revenir et le saisir, 3. créer les enregistrements DNS affichés (flux existant), 4. « Vérifier ». Le guide indique le délai normal de propagation et quoi faire si la vérification échoue. (L'achat direct dans Axso viendra quand Orange Money / MTN seront intégrés.)

---

### B7. Tableau de bord (refonte complète)

**But** : montrer les **résultats** et ce qui demande une action, sans se perdre.

Ordre de haut en bas :
1. **Barre d'état de la boutique** : « En ligne » / « Non publiée » + adresse de la boutique (copier, QR code existant) + bouton **« Publier ma boutique »** si non publiée (sinon « Voir ma boutique »). Sélecteur de période : Aujourd'hui · 7 jours · 30 jours · Ce mois.
2. **Indicateurs clés** (avec comparaison à la période précédente) : **Commandes** (mis en avant, plus grand) · Chiffre d'affaires · Panier moyen · Visiteurs · Taux de conversion (commandes / visiteurs).
3. **À traiter maintenant** : commandes à confirmer, commandes à expédier, retours en attente, produits en rupture / stock faible, messages clients non lus — chaque ligne = nombre + bouton vers la liste filtrée. Vide → « Rien à traiter, tout est à jour. »
4. **Ventes en cours** = commandes **payées mais pas encore livrées**, regroupées par statut (confirmée → en préparation → expédiée), avec le montant total en cours et un lien vers chaque commande.
5. **Courbe des ventes** sur la période.
6. **20 derniers clients** : nom, ville, nombre de commandes, total dépensé, date de dernière commande, bouton WhatsApp ; lien « Voir tous les clients ».
7. **Produits les plus vendus** (top 5) et **villes principales** (déjà calculées).
8. **Mon argent** : solde disponible, montant en attente (séquestre), bouton **« Retirer mon argent »** (B9).

Tout est calculé sur les données existantes (`commande`, `client`, `analytics`, `produit`, wallet) ; aucun indicateur sans source.

---

### B8. Publication de la boutique

**Ce qui existe déjà** — ne pas le refaire :
- statut `Tenant.statut` : `brouillon` (créée ainsi à l'inscription) → `active` (publiée) ; `pause` existe aussi ;
- critères dans `lib/boutique-completion.ts` (source unique, utilisée par `PATCH /api/tenants` et l'outil Axia `publier_boutique`) : nom, WhatsApp, pays, description, ≥ 1 produit actif ;
- boutique en brouillon invisible au public, visible en aperçu par le marchand (`lib/tenant.ts`, `BoutiqueNonPubliee`) ;
- bouton « Publier » dans le constructeur.

**Conditions** : garder les critères existants **sans en ajouter**. Nom, WhatsApp, pays et description sont remplis par l'inscription, donc en pratique la seule condition à remplir par le marchand est **1 vrai produit actif** (les produits d'exemple d'Axia sont créés inactifs et ne comptent pas). Livraison, politiques et coordonnées ne bloquent pas la publication (cf. B10).

**À ajouter** :
- bouton « Publier ma boutique » aussi sur l'Accueil et le Tableau de bord, branché sur la même route et les mêmes critères ;
- s'il manque un critère : liste précise de ce qui manque, chaque ligne menant à l'endroit à corriger ;
- après publication : écran de célébration sobre, lien de la boutique + partage (WhatsApp, copier le lien, QR code existant), puis rappel « Pour bien vendre, il te reste : … » (B10).

---

### B10. Pousser le marchand à compléter sa boutique après publication

**But** : livraison, politiques et coordonnées ne bloquent pas la publication, mais le marchand doit sentir qu'elles manquent et savoir **en un clic** où les remplir. Modèle : la checklist de Shopify + l'indicateur de complétude de profil de LinkedIn/Jumia.

1. **Jauge « Boutique complète à X % »** calculée sur les cartes « Pour bien vendre » (B4), affichée :
   - en haut du Tableau de bord : bandeau orange avec les éléments manquants, chaque élément = lien direct ; bouton « Plus tard » qui le réduit pendant 24 h seulement ; il disparaît à 100 % ;
   - dans le constructeur : même bandeau, discret ;
   - dans la barre latérale : pastille orange sur « Accueil » avec le nombre d'étapes restantes, et pastille sur les entrées concernées (Livraison, Boutique › Politiques, Réglages).
2. **Conséquence réelle expliquée** sur chaque élément manquant, pour motiver sans mentir (vérifier dans le code avant de rédiger chaque phrase) :
   - livraison : « Tes clients ne voient pas le prix de la livraison au moment de commander » ;
   - politiques : « Les liens Livraison / Retours de ton pied de page sont vides : les clients hésitent à commander » ;
   - coordonnées : « Ta page Contact n'affiche que ton WhatsApp ».
3. **Axia proactif** : message dans le chat Axia à l'ouverture (mécanisme existant `lib/axia/constats.ts`) proposant de faire l'étape avec lui (« Je prépare tes zones de livraison ? »).
4. **Relances** : notification + e-mail à J+1, J+3, J+7 après publication tant qu'il reste des étapes (mécanisme existant `lib/relances.ts`, notifications push), avec lien direct vers l'étape, arrêt dès que c'est complété.
5. **Récompense** : uniquement quand **toutes** les étapes « Pour bien vendre » sont terminées, badge « Boutique complète » affiché au marchand (Tableau de bord et Accueil), avec un message de félicitations. Il disparaît automatiquement après 7 jours (date de passage à 100 % enregistrée). Si une étape redevient incomplète (ex. zone de livraison supprimée), le badge disparaît et le bandeau de complétude revient.

---

### B11. Recherche dans la barre latérale et dans le constructeur

**Ce qui existe déjà** :
- `components/dashboard/RechercheDashboard.tsx` : recherche globale (Ctrl+K / ⌘K) dans l'en-tête sur desktop, loupe plein écran sur mobile ; cherche les pages du menu (`pagesDashboard` de `Sidebar.tsx`), les produits, commandes et clients, en respectant les permissions.
- `app/(dashboard)/dashboard/builder/RechercheConstructeur.tsx` : recherche dans le constructeur (sections, éléments, réglages, pages, sections de la fiche produit avec mots-clés).

**À faire** (améliorer, ne pas dupliquer) :
- **Barre latérale** : ajouter un champ « Rechercher… » en haut de la barre latérale, qui filtre les entrées du menu en direct (sous-menus compris, ouverts automatiquement sur le résultat) et propose en dessous « Chercher “…” partout » qui ouvre la recherche globale existante.
- **Mots-clés et synonymes** pour chaque page et sous-page (ex. « retirer », « argent », « retrait » → Mon argent ; « livraison », « expédition », « frais de port » → Livraison ; « politique », « CGV », « retours » → Politiques ; « domaine », « adresse », « URL » → Domaine), recherche sans accents ni majuscules, tolérante aux petites fautes.
- Indexer aussi les **sections des pages Réglages** (ex. « horaires » → Réglages › Coordonnées) et pas seulement les pages.
- **Constructeur** : rendre la recherche visible en permanence en haut du panneau (pas seulement via un raccourci), étendre les mots-clés à tous les blocs et réglages (couleurs, polices, logo, panier, pied de page, menu…), sélection du résultat = élément mis en surbrillance dans l'aperçu + panneau de réglage ouvert.
- Résultat vide : « Aucun résultat pour “…” » + bouton « Demander à Axia ».

---

### B9. Retirer son argent (wallet)

**Problème** : le marchand se perd entre Wallet, Revenus et Paiements quand il veut retirer son argent.

**Attendu** :
1. Diagnostiquer d'abord les pages `wallet`, `revenus`, `paiements` : qui affiche quoi, doublons, vocabulaire.
2. Un seul point d'entrée clair : menu « Mon argent » + carte « Mon argent » du Tableau de bord + bouton « Retirer mon argent » toujours visible sur cette page.
3. Trois montants expliqués en une phrase chacun : **Disponible** (retirable maintenant) · **En attente** (séquestre : pourquoi et quand il sera libéré) · **Déjà retiré**.
4. Retrait en un écran : montant (prérempli au maximum disponible), compte de réception (numéro Mobile Money mémorisé, modifiable), frais et montant net affichés avant confirmation, bouton « Confirmer le retrait de {montant} ».
5. Suivi du retrait visible : Demandé → En cours de validation (validation manuelle Axso, délai annoncé) → Payé, avec notification à chaque étape.
6. Règles de retrait existantes (montants minimums, validation manuelle, séquestre) **inchangées**.

---

## 4. LIVRABLES

Pour chaque lot :
- le diagnostic (avant) puis la liste des fichiers modifiés et l'effet visible (après) ;
- les vérifications : chargement, erreur, vide, mobile 360 px, permissions, aucune régression sur les parcours critiques (inscription, création de boutique, produits, commandes, POS, achat client, affiliation, livraison, Command Center) ;
- `npm test` et `npm run build` passent ;
- migrations Prisma fournies pour tout nouveau champ (politiques B5, mode d'achat B3, suivi des étapes B4/B10) ; ne jamais les lancer sur la production sans accord explicite (`.env` pointe vers la prod).

## 5. CE QU'IL NE FAUT PAS FAIRE

- Modifier le parcours d'inscription au-delà de l'écran B1.
- Publier automatiquement une boutique ou déclarer une boutique publiable si les conditions ne sont pas remplies.
- Montrer des produits, avis, statistiques ou textes d'exemple aux clients comme s'ils étaient réels.
- Changer les règles de paiement, de commission, de séquestre ou de retrait.
- Faire une refonte visuelle sans diagnostic validé.
