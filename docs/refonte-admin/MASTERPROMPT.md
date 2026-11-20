# MASTERPROMPT — Refonte complète de l'admin AXSO
### Alignement strict sur les normes UI/UX des grandes plateformes e-commerce (référence : admin Shopify / Polaris)

> **Mode d'emploi**
> 1. Copie ce fichier dans le repo AXSO sous `docs/refonte-admin/MASTERPROMPT.md`. Il est **autonome** : le prototype HTML complet est inclus en **ANNEXE A**, à la fin du document.
> 2. Dans Claude Code, à la racine du repo : *« Lis `docs/refonte-admin/MASTERPROMPT.md` et exécute-le à la lettre, en commençant par l'étape 0 puis la phase 1. »*
> 3. Valide le plan de la phase 1 avant de laisser Claude Code coder.

> **ÉTAPE 0 (à faire avant toute chose) — extraire le prototype**
> Copie **à l'identique, caractère pour caractère**, le contenu du bloc de code de l'**ANNEXE A** (entre ` ````html ` et ` ```` `) dans le fichier `reference/axso-admin-prototype.html`. Ne le reformate pas, ne le modifie pas, ne le minifie pas.
> Vérifie ensuite qu'il s'ouvre dans un navigateur (`file://…/reference/axso-admin-prototype.html#home`) sans erreur console, et qu'il commence par `<!DOCTYPE html>` et se termine par `</html>`.
> Ce fichier est la **référence visuelle** de tout le projet : ne le supprime jamais et ne l'importe jamais dans le code de production.

---

## SOMMAIRE

0. Rôle, objectif, règles absolues
1. Phase 1 — Audit obligatoire
2. Architecture front cible
3. Design tokens (valeurs exactes)
4. Typographie, iconographie, illustrations
5. Layout global (mesures au pixel)
6. Navigation, routes et deep-links
7. Bibliothèque de composants (API, variantes, états)
8. Spécifications écran par écran
9. Paramètres (layout dédié + 19 sections)
10. AXIA (assistant IA)
11. Recherche globale et raccourcis clavier
12. États système : chargement, vide, erreur, permissions
13. Responsive (comportement mobile type plateforme de référence)
14. Interactions, animations, micro-copies
15. Modèles de données TypeScript
16. Formats et localisation (Cameroun / zone FCFA)
17. Accessibilité
18. Performance
19. Tests et contrôle visuel
20. Méthode de travail, commits, livrables
21. Critères d'acceptation (checklist finale)
22. Anti-patterns interdits (ce qui « fait IA »)
- **ANNEXE A** — Prototype HTML complet (source de vérité visuelle)
- **ANNEXE B** — Guide de lecture du prototype

---

## 0. RÔLE, OBJECTIF, RÈGLES ABSOLUES

**Rôle** : tu es lead front-end et design engineer senior, spécialiste des back-offices SaaS à fort volume (Shopify, Stripe, Linear). Tu écris un code de production, typé, testé et maintenable.

**Objectif** : refondre **100 % de l'interface d'administration AXSO** (le back-office des e-commerçants) pour qu'elle reproduise **exactement** le rendu, la structure, le design system, les parcours, les interactions et le responsive du prototype `reference/axso-admin-prototype.html`. Ce prototype applique fidèlement les normes de l'admin Shopify. AXSO doit pouvoir être comparé à cette plateforme sans rougir.

**Source de vérité** : le prototype. Ouvre-le dans un navigateur (`file://…/reference/axso-admin-prototype.html#orders`, etc.), inspecte les styles et mesure les écarts. Quand ce document et le prototype divergent, **ce document l'emporte pour le comportement, le prototype pour le visuel**.

**Règles absolues** :
1. **Ne modifie aucune logique métier** (API, auth, permissions, calculs, modèles, webhooks, jobs). Tu refais la couche présentation, la navigation et l'état d'UI. Si une donnée n'est pas exposée par l'API, crée un mock typé et note-le ; ne modifie pas le back-end sans demande explicite.
2. **Zéro élément de marque tierce** : ni logo, ni nom, ni asset, ni police propriétaire Shopify. On reprend les normes UX, pas l'identité. L'assistant s'appelle **AXIA**, la marque **AXSO**.
3. **UI en français** (i18n prête pour l'anglais) ; devise **FCFA (XAF)**.
4. **Pas de nouvelle dépendance lourde** sans justification écrite dans le plan (pas de librairie UI complète par-dessus la stack existante, pas de librairie de graphiques de plus de 50 Ko gzip si un SVG suffit).
5. **Aucune valeur en dur** (couleur, taille, espacement, radius, ombre) dans les composants : tout passe par les tokens.
6. **Pas de régression** : les tests existants doivent rester au vert à chaque commit.
7. **Pas de décision silencieuse** : toute ambiguïté est consignée dans `docs/refonte-admin/DECISIONS.md` (contexte, option choisie, raison).

---

## 1. PHASE 1 — AUDIT OBLIGATOIRE (aucun code avant validation)

Produis `docs/refonte-admin/PLAN.md` contenant :

1. **Stack détectée** : framework et version, routeur, rendu (SPA / SSR / RSC), gestion d'état, data fetching, CSS, icônes, i18n, tests (unitaires et e2e), lint et format, CI.
2. **Inventaire des routes admin** existantes (chemin, composant, données consommées, permissions).
3. **Mapping vers l'arborescence cible** (section 6), en tableau : `route actuelle → route cible → statut (existe / à créer / à fusionner / à supprimer) → endpoints API utilisés`.
4. **Inventaire des composants UI** existants, chacun classé « réutiliser et restyler », « remplacer » ou « supprimer », avec le nombre d'usages.
5. **Écarts fonctionnels** : fonctionnalités présentes dans la cible mais absentes de l'API (à mocker), et l'inverse (à conserver et à placer dans la nouvelle structure).
6. **Risques** (auth, SEO, performance, i18n, dette) et mitigation.
7. **Plan de livraison** découpé en lots avec estimation (section 20).
8. **Arborescence de fichiers proposée** (section 2) adaptée à la stack.

Puis **arrête-toi et attends ma validation**.

---

## 2. ARCHITECTURE FRONT CIBLE

Adapte les noms à la stack détectée, mais garde ce découpage :

```
src/
  design-system/
    tokens/            tokens.css (variables CSS) + tokens.ts (export typé) + thème Tailwind si Tailwind
    icons/             Icon.tsx + registry des paths (une seule famille, voir §4.2)
    illustrations/     EmptyState*.tsx, FeedArt*.tsx (SVG inline)
    components/        Button, Badge, Card, PageHeader, IndexTable, IndexFilters, MetricsStrip,
                       EmptyState, Charts/*, SettingsRow, Toggle, Field, Select, Checkbox, Banner,
                       Modal, BottomSheet, Popover, Menu, CommandPalette, Toast, Tooltip, Tabs,
                       Skeleton, Avatar, Thumbnail, Pagination, Timeline, KeyValue, Divider
    layout/            AppShell, Sidebar, SettingsShell, SettingsSidebar, MobileTopBar, Page, Layout(2 colonnes)
  features/
    home/ orders/ products/ customers/ growth/ discounts/ content/ markets/ analytics/
    channels/online-store/ channels/agentic/ channels/whatsapp/ channels/social/
    apps/cod/ settings/<section>/
    axia/              AxiaDock, AxiaPanel, axia.store, axia.api
    search/            CommandPalette data providers
  lib/  format.ts (FCFA, dates, téléphones), i18n/, hooks/ (useMediaQuery, useHotkeys, useSelection)
  mocks/               données typées pour les endpoints absents (une ligne de commentaire par fichier : « À remplacer par GET /… »)
  pages|app/           routes (selon le routeur)
docs/refonte-admin/   PLAN.md, DECISIONS.md, CHANGELOG.md, COMPONENTS.md, SCREENSHOTS/
```

Page de démo interne **`/admin/_ui`**, protégée et désactivée en production : elle affiche chaque composant dans toutes ses variantes et tous ses états (sert de recette visuelle). Si Storybook existe déjà, utilise-le à la place.

---

## 3. DESIGN TOKENS (VALEURS EXACTES)

### 3.1 Couleurs

```css
:root{
  /* --- Cadre & navigation --- */
  --color-frame:#0c0c0c;           /* fond global + sidebar */
  --color-nav-text:#e3e3e3;
  --color-nav-text-muted:#a1a1a1;  /* sous-items, labels de groupe */
  --color-nav-icon:#cfcfcf;
  --color-nav-hover:#1f1f1f;
  --color-nav-active:#2b2b2b;
  --color-nav-search-bg:#262626;
  --color-nav-search-bg-hover:#2c2c2c;
  --color-nav-search-border:#333333;
  --color-nav-count-bg:#333333;
  --color-nav-divider:#1f1f1f;

  /* --- Surfaces --- */
  --color-bg:#ffffff;              /* zone de contenu */
  --color-surface:#ffffff;         /* cartes */
  --color-surface-secondary:#f7f7f7;  /* en-têtes de table, hover de ligne, pied de pagination */
  --color-surface-tertiary:#f1f1f1;   /* onglet actif, bouton tint, puces */
  --color-surface-selected:#f3f3f3;   /* ligne sélectionnée */
  --color-border:#e3e3e3;
  --color-border-secondary:#ebebeb;   /* séparateurs internes */
  --color-border-input:#8a8a8a;
  --color-border-strong:#1a1a1a;      /* focus input */

  /* --- Texte --- */
  --color-text:#303030;
  --color-text-strong:#1a1a1a;
  --color-text-secondary:#616161;
  --color-text-subdued:#8a8a8a;
  --color-text-on-dark:#ffffff;
  --color-link:#005bd3;
  --color-critical-text:#8e0b21;     /* ex. stock bas */

  /* --- Action --- */
  --color-primary:#1a1a1a;
  --color-primary-hover:#2b2b2b;
  --color-primary-pressed:#000000;

  /* --- Badges (fond / texte) --- */
  --badge-success-bg:#cdfee1;   --badge-success-text:#0c5132;
  --badge-attention-bg:#ffeb78; --badge-attention-text:#4f4700;
  --badge-warning-bg:#ffd6a4;   --badge-warning-text:#5e4200;
  --badge-critical-bg:#fedad9;  --badge-critical-text:#8e0b21;
  --badge-info-bg:#e0f0ff;      --badge-info-text:#00527c;
  --badge-neutral-bg:#e3e3e3;   --badge-neutral-text:#303030;

  /* --- Bannières --- */
  --banner-info-bg:#eaf4ff;     --banner-info-text:#00527c;
  --banner-warning-bg:#fff5ea;  --banner-warning-text:#5e4200;
  --banner-critical-bg:#fff0f0; --banner-critical-text:#8e0b21;
  --banner-success-bg:#edfbf3;  --banner-success-text:#0c5132;

  /* --- Suggestions IA (lignes « Créer le marché… ») --- */
  --color-magic-bg:#f6f2ff; --color-magic-border:#ece4ff; --color-magic-text:#5b3cc4;

  /* --- Marque AXSO : usage RESTREINT (voir §3.6) --- */
  --color-brand:#EBA900;         /* jaune AXSO */
  --color-brand-ink:#0A1A33;     /* bleu nuit AXSO */

  /* --- Data viz --- */
  --chart-primary:#2a6fdb;
  --chart-compare:#9fc3f6;       /* période de comparaison, en pointillés 3/3 */
  --chart-cyan:#1bb6e8;
  --chart-violet:#7c3aed;
  --chart-grid:#ebebeb;
  --chart-axis-text:#8a8a8a;
  --chart-funnel-1:#2a4fd7; --chart-funnel-2:#7d96f0; --chart-funnel-3:#c6d3fb;
  --map-land:#4fb8ad; --map-sea:#cdeee9;

  /* --- Statuts « live » --- */
  --color-live:#29845a;          /* anneau 2px « visiteurs en direct » */
  --color-notification:#e51c00;  /* pastille rouge cloche */
}
```

### 3.2 Espacements (base 4px)
`--space-0:0; --space-050:2px; --space-100:4px; --space-150:6px; --space-200:8px; --space-300:12px; --space-400:16px; --space-500:20px; --space-600:24px; --space-800:32px; --space-1000:40px; --space-1200:48px; --space-1600:64px`

Règles :
- Padding des cartes : 16px.
- Espace entre cartes empilées : 16px ; gouttière des grilles de cartes : 16px.
- Padding horizontal des pages : 20px en desktop, 16px à ≤ 1040px, 12px à ≤ 820px.
- Espace entre l'en-tête et le contenu : 4px.
- Entre deux sections titrées : 24px.

### 3.3 Radius
`--radius-sm:5px` (checkbox) · `--radius-md:8px` (boutons, inputs, items de nav, badges) · `--radius-lg:10px` (bannières, recherche de la nav) · `--radius-xl:12px` (cartes, zone de contenu) · `--radius-2xl:14px` (modales, dock AXIA, feed cards) · `--radius-3xl:16px` (champ AXIA de l'accueil) · `--radius-full:9999px`.

### 3.4 Ombres
```
--shadow-card: 0 0 0 1px rgba(0,0,0,.07), 0 1px 0 rgba(0,0,0,.05);
--shadow-button: inset 0 0 0 1px #dcdcdc, inset 0 -1px 0 #d4d4d4;
--shadow-button-pressed: inset 0 0 0 1px #cccccc;
--shadow-button-primary: inset 0 -1px 0 1px rgba(0,0,0,.8), inset 0 0 0 1px #303030, inset 0 .5px 0 1.5px rgba(255,255,255,.25);
--shadow-popover: 0 0 0 1px #e3e3e3, 0 8px 24px rgba(0,0,0,.12);
--shadow-modal: 0 26px 80px rgba(0,0,0,.35);
--shadow-ask: 0 0 0 1px #e3e3e3, 0 4px 14px rgba(0,0,0,.06);
--shadow-drawer: 0 0 0 1px #e3e3e3, 0 20px 50px rgba(0,0,0,.25);
```

### 3.5 Z-index
`header sticky 5 · mobile top bar 40 · dock 30 · panneau AXIA 60 · tiroir nav 75 (voile 74) · modale 80 · toast 90 · tooltip 95`

### 3.6 Règles d'usage de la marque
Le jaune `#EBA900` et le bleu `#0A1A33` apparaissent **uniquement** dans :
- le logo ;
- l'avatar boutique (fond jaune, initiales bleues) ;
- l'icône AXIA (étoile jaune sur carré bleu nuit) ;
- les illustrations et vignettes du fil d'accueil ;
- l'aperçu du thème de la boutique.

**Jamais** sur les boutons, les liens, les badges, les fonds de section ni les titres. Les boutons primaires sont **noirs**.

---

## 4. TYPOGRAPHIE, ICONOGRAPHIE, ILLUSTRATIONS

### 4.1 Typographie
Police **Inter** (Google Fonts ou auto-hébergée), graisses 400, 450, 500, 550, 600, 650, 700 ; `font-feature-settings:"cv11","ss01"` ; `-webkit-font-smoothing:antialiased`. Chiffres de tableaux et de KPI en `font-variant-numeric: tabular-nums`.

| Token | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| `text-body` | 13/20 | 400 | texte courant, cellules |
| `text-body-medium` | 13/20 | 550 | items de nav, boutons, libellés forts |
| `text-small` | 12/16 | 400–550 | en-têtes de colonnes, méta, badges, deltas |
| `heading-page` | 14/20 | 650 | titre de l'en-tête de page |
| `heading-card` | 13/20 | 650 | titre de carte |
| `heading-section` | 20/28 | 650 (ls −0.2px) | titre de page Paramètres, gros bandeaux |
| `heading-xl` | 22–24/30–32 | 550–650 (ls −0.3px) | Autopilot, Déploiements, Agentique |
| `display-home` | 28/36 | 550 (ls −0.4px) | hero de l'accueil |
| `kpi-lg` | 20/28 | 650 (ls −0.3px) | valeur KPI principale |
| `kpi-md` | 16/24 | 650 | valeur KPI en carte |

### 4.2 Icônes
- Une seule famille, au **trait** : viewBox 20×20, `stroke-width:1.5`, `stroke-linecap:round`, `stroke-linejoin:round`, `fill:none`, `stroke:currentColor`.
- Tailles : 20px dans la navigation et la barre mobile, 16px dans le contenu, les boutons et les en-têtes.
- Extrais les paths du prototype (objet `P` dans le script) et crée un registre `IconName`.
- Liste minimale : `home, orders, tag, user, users, gauge, discount, image, globe, bars, store, sparkle, meta, whatsapp, gear, search, plus, chevronRight, chevronDown, chevronLeft, chevronUpDown, x, mic, wave, history, columns, sort, calendar, eye, bell, export, import, grid, info, checkCircle, lock, dots, panel, box, truck, card, money, pin, receipt, mail, language, shield, doc, link, bolt, database, folder, menu, pen, external, arrowRight, arrowUp, fullscreen, star, flag`.
- Couleur des icônes : `--color-nav-icon` dans la nav, `#4a4a4a` dans les en-têtes, `currentColor` ailleurs.

### 4.3 Illustrations (états vides et fil d'accueil)
- **Style** : aplats, formes géométriques simples, 3 ou 4 couleurs maximum ; pas de dégradé, pas de personnage, pas de 3D.
- **Palette** : gris `#f1f1f1 / #e3e3e3 / #d4d4d4`, vert `#1f7a55`, teal `#4fb3a9 / #2f8f85`, jaune `#EBA900`, ocre `#e2a44a`.
- **Format** : composants SVG inline de 200×150 pour les états vides et de 280×140 (en `slice`) pour les vignettes du fil.
- **Illustrations à créer** :
  - États vides : brouillons, bons de commande, transferts, cartes-cadeaux, B2B, blog, catalogues, campagnes.
  - Vignettes du fil : conversion, Mobile Money, domaine, livraison, WhatsApp, applications, cartons.
- Reprends les SVG du prototype (objet `ILL` et fonctions `art*`) comme base.

---

## 5. LAYOUT GLOBAL (MESURES AU PIXEL)

### 5.1 App shell (desktop > 820px)
- `body` et shell : fond `--color-frame`, `height:100vh`, `display:flex`, `padding: 0 6px 6px 0`.
- **Sidebar** : largeur fixe 240px, `padding: 10px 8px 8px 12px`, colonne flex (haut / zone scrollable / bas).
- **Zone principale** : `flex:1`, fond blanc, `border-radius:12px`, `margin-top:6px`, `overflow:auto`. **C'est elle qui scrolle**, pas le body. Scrollbar fine (10px, pouce `#d4d4d4` arrondi avec bordure blanche de 3px).

### 5.2 Sidebar (de haut en bas)
1. **Ligne logo** (36px de haut, `padding 0 4px 0 6px`) :
   - Logo AXSO de 26×26 (fond blanc, radius 6px, padding 2px) + « AXSO » (14px, 650).
   - À droite, bouton icône « Réduire la barre latérale » (28×28, radius 8px, icône `panel` 16px, gris → blanc au survol).
2. **Champ de recherche** (34px, radius 10px, fond `--color-nav-search-bg`, bordure 1px `--color-nav-search-border`, `margin 0 2px 10px`) : icône loupe 16px, « Rechercher », `Ctrl K` aligné à droite (12px, `#8a8a8a`). Au clic : ouvre la CommandPalette.
3. **Zone scrollable** (scrollbar fine `#333`) :
   - **Item** : 30px de haut, radius 8px, `padding 0 8px`, gap 10px, graisse 550, icône 20px. Survol : `--color-nav-hover`. Actif : `--color-nav-active` et texte blanc.
   - **Compteur** (Commandes) : à droite, fond `#333`, 12px/550, radius 7px, `padding 0 6px`, interligne 20px. Format « 1 209 ».
   - **Pastille d'état** (ex. Facebook & Instagram) : point de 6px `#8a8a8a` à droite.
   - **Sous-items** : visibles **uniquement si la section parente est active** (y compris quand un de ses sous-items l'est). 28px de haut, `padding-left:38px`, gris `--color-nav-text-muted`, 500. Survol : fond hover et texte `#e3e3e3`. Actif : fond actif, texte blanc, 600.
   - Quand un sous-item est actif, le parent garde son fond actif (comportement de la référence).
   - **Labels de groupe** « Canaux de vente › » et « Applications › » : 12px/550, gris, `padding 16px 8px 4px`, chevron 16px. Clic sur « Canaux de vente » : modale « Ajouter un canal de vente ». Clic sur « Applications » : popover/modale de recherche d'applications (§8.24).
4. **Pied** (bordure haute 1px `--color-nav-divider`, `padding-top 6px`) :
   - Item « Paramètres » (icône engrenage).
   - **Puce boutique** : avatar 20×20 (radius 5px, fond jaune, initiales bleu nuit 11px/700), nom de la boutique (550), cloche 16px à droite avec badge rouge (10px/600, `padding 0 4px`, radius 7px, positionné en haut à droite).

**Ordre exact des items** :
Accueil · Commandes (1 209) · Produits · Clients · Croissance · Réductions · Contenu · Marchés · Analyses de données — *Canaux de vente ›* — Boutique en ligne · Agentique · WhatsApp Business · Facebook & Instagram — *Applications ›* — (applications installées, ex. Formulaire COD) — [pied] Paramètres · Boutique.

### 5.3 En-tête de page (`PageHeader`)
- `position:sticky; top:0`, z-index 5, fond `rgba(255,255,255,.96)` + `backdrop-filter: blur(6px)`.
- `min-height:56px`, `padding:10px 20px`, marge négative horizontale pour occuper toute la largeur de la page, `margin-bottom:4px`.
- **À gauche** : (bouton retour ‹ optionnel pour les fiches) + icône de section 16px (`#4a4a4a`) + titre (14px/650) + badges inline optionnels + méta optionnelle en gris (ex. « Actualisation aujourd'hui à 16:09 », sélecteur « Performance ⇅ »).
- **À droite**, dans cet ordre : boutons secondaires (« Exporter », « Importer », « Plus d'actions ⌄ »…), puis **au plus un** bouton primaire noir, toujours tout à droite.
- Le bouton « ⋯ » (menu de débordement) n'apparaît qu'en mobile, ou quand l'espace manque.

### 5.4 Conteneurs de page
| Type | max-width | Usage |
|---|---|---|
| `full` | 1200px | listes (Commandes, Produits, Clients, Rapports…) |
| `narrow` | 1000px | fiches détail, accueil, états vides |
| `thin` | 720px | Paramètres, Préférences |

Centrés horizontalement, `padding-bottom:120px` (pour laisser de la place au dock AXIA).

### 5.5 Layout 2 colonnes (fiches)
`grid-template-columns: 2fr 1fr; gap:16px; align-items:start`. La colonne de gauche contient les cartes principales, celle de droite les cartes de métadonnées. Sur mobile : une seule colonne, la colonne de droite passant **après** la gauche.

---

## 6. NAVIGATION, ROUTES ET DEEP-LINKS

Préfixe admin : `/admin` (ou celui de la stack). Chaque vue a une URL propre ; le retour arrière du navigateur fonctionne ; recharger la page conserve la vue, les filtres (en query string) et l'onglet actif.

| Section | Route | Sous-routes |
|---|---|---|
| Accueil | `/admin` | — |
| Commandes | `/admin/orders` | `/admin/orders/:id`, `/admin/draft_orders`, `/admin/draft_orders/new`, `/admin/checkouts` |
| Produits | `/admin/products` | `/admin/products/new`, `/admin/products/:id`, `/admin/collections`, `/admin/collections/:id`, `/admin/products/inventory`, `/admin/purchase_orders`, `/admin/transfers`, `/admin/gift_cards` |
| Clients | `/admin/customers` | `/admin/customers/:id`, `/admin/customers/segments`, `/admin/companies` |
| Croissance | `/admin/growth` | `/admin/growth/attribution`, `/admin/growth/autopilot`, `/admin/growth/campaigns` |
| Réductions | `/admin/discounts` | `/admin/discounts/new`, `/admin/discounts/:id` |
| Contenu | `/admin/content/metaobjects` | `/admin/content/files`, `/admin/content/menus`, `/admin/content/articles` |
| Marchés | `/admin/markets` | `/admin/markets/catalogs`, `/admin/markets/rollouts` |
| Analyses | `/admin/analytics` | `/admin/analytics/reports`, `/admin/analytics/reports/:id`, `/admin/analytics/live` |
| Boutique en ligne | `/admin/online_store` | `/admin/online_store/pages`, `/admin/online_store/preferences`, `/admin/online_store/themes/:id/editor` |
| Agentique | `/admin/channels/agentic` | — |
| WhatsApp Business | `/admin/channels/whatsapp` | onglets `?tab=overview\|messages\|broadcasts\|settings` |
| Facebook & Instagram | `/admin/channels/social` | onglets `?tab=overview\|settings` |
| Applications | `/admin/apps/:handle` | Formulaire COD : `/admin/apps/cod`, `/admin/apps/cod/fraud`, `/admin/apps/cod/plans` |
| Paramètres | `/admin/settings/general` | `plan, billing, users, payments, checkout, customer_accounts, shipping, taxes, locations, apps, channels, domains, customer_events, notifications, metafields, languages, customer_privacy, policies` |

Le titre d'onglet du navigateur suit le format `{Boutique} · {Page} · AXSO`.

Les filtres d'index sont en query string, ex. `?view=unfulfilled&q=moussa&sort=created_at:desc&page=2`.

---

## 7. BIBLIOTHÈQUE DE COMPOSANTS (API, VARIANTES, ÉTATS)

> Pour chaque composant :
> - **props typées** ;
> - **tous les états** (default / hover / pressed / focus-visible / disabled / loading) ;
> - une **entrée dans `/admin/_ui`** ;
> - un **test unitaire** (rendu + interaction principale).
>
> Documente l'API dans `docs/refonte-admin/COMPONENTS.md`.

### 7.1 Button
```ts
type ButtonProps = {
  variant?: 'default'|'primary'|'plain'|'ghost'|'tint'|'critical';
  size?: 'md'|'sm';           // md = 30px, sm = 26px (12px)
  icon?: IconName; iconPosition?: 'start'|'end';
  disclosure?: boolean;       // ajoute chevronDown (menu déroulant)
  loading?: boolean; disabled?: boolean; fullWidth?: boolean;
  href?: string; onClick?: () => void; 'aria-label'?: string;
}
```
- **default** : fond blanc, `--shadow-button`, texte `--color-text-strong` 550, `padding 0 12px`, radius 8px, gap 6px. Survol `#f7f7f7`. Pressé : `#f0f0f0` + `--shadow-button-pressed`.
- **primary** : fond `--color-primary`, texte blanc, `--shadow-button-primary`. Survol `#2b2b2b`.
- **plain** : texte `--color-link`, sans fond ni ombre, souligné au survol.
- **ghost** : sans fond ni ombre ; survol `--color-surface-tertiary`.
- **tint** : fond `#f1f1f1`, sans ombre ; survol `#e7e7e7`.
- **critical** : fond `#c70a24`, texte blanc (suppression).
- **loading** : spinner 16px à la place du libellé, largeur conservée, `aria-busy`.
- **disabled** : opacité .45, pas de pointeur.
- **focus-visible** : anneau 2px `#005bd3` avec offset 1px (tous les éléments interactifs).
- Bouton icône seul (`IconButton`) : 28×28, radius 8px, `aria-label` obligatoire.

### 7.2 Badge
```ts
type BadgeProps = { tone?: 'success'|'attention'|'warning'|'critical'|'info'|'neutral'; progress?: 'none'|'incomplete'|'partial'|'complete'; children: string; size?: 'md'|'sm' }
```
- 20px de haut, `padding 0 8px`, radius 8px, 12px/550, gap 4px.
- `progress` : pastille de 8px bordée 1.5px — `incomplete` vide, `partial` demi-pleine (`linear-gradient(90deg,currentColor 50%,transparent 50%)`), `complete` pleine.
- **Mapping métier obligatoire** :

| Domaine | Valeur | tone | progress |
|---|---|---|---|
| Paiement | Paiement à la livraison | attention | partial |
| Paiement | Payé · MTN MoMo / Payé · Orange Money / Payé · Carte | success | complete |
| Paiement | En attente | warning | partial |
| Paiement | Remboursé / Partiellement remboursé | neutral / warning | complete / partial |
| Paiement | Annulé | neutral | none |
| Traitement | Non traitée | attention | incomplete |
| Traitement | Partiellement traitée | warning | partial |
| Traitement | Traitée | neutral | complete |
| Livraison | En cours de livraison | info | partial |
| Livraison | Livrée | success | complete |
| Livraison | Refusée à la livraison | critical | none |
| Produit | Actif / Brouillon / Archivé | success / info / neutral | none |
| Panier | Non récupéré / Relance envoyée / Récupéré | warning / info / success | none |
| Réduction | Actif / Programmé / Expiré | success / info / neutral | none |
| Perf. web | Bon / Modéré / Lent | success / attention / critical | none |

### 7.3 Card
- Props : `title?, actions?, padding?: 'none'|'md', sectioned?`.
- Fond blanc, radius 12px, `--shadow-card`, `overflow:hidden`.
- Sections internes séparées par 1px `--color-border-secondary` (et `Divider` avec marges négatives de −16px).
- `Card` suivie de `Card` : `margin-top:16px` **sauf** dans une grille (jamais de double espacement).

### 7.4 PageHeader
- Props : `icon, title, backHref?, titleMeta?: ReactNode (badges, méta), primaryAction?, secondaryActions?: Action[], overflowActions?: Action[]`.
- En mobile, `secondaryActions` et `overflowActions` passent dans le menu « ⋯ » (BottomSheet).

### 7.5 IndexFilters + IndexTable (composant central, soin maximal)

**IndexFilters** (barre de 44px, `padding 0 8px 0 12px`, bordure basse) :
- **Onglets de vues** : 28px, radius 8px, 550, gris ; l'onglet actif a un fond `--color-surface-tertiary`, un texte fort et une icône ⇅ (menu « Renommer / Dupliquer / Supprimer la vue »).
- **Recherche** « Rechercher et filtrer » (icône loupe 16px, input transparent), avec un debounce de 250ms. Elle met à jour `?q=`.
- **Filtres** sous forme de pills sous la barre quand ils sont actifs (ex. « Statut du paiement : À la livraison ✕ ») et bouton « Ajouter un filtre + ».
- Boutons « Colonnes » (popover de cases à cocher, persistance par utilisateur) et « Trier » (popover de choix de colonne + ordre).

**IndexTable** :
```ts
type Column<T> = { id: string; header: string; cell: (row:T)=>ReactNode; align?: 'start'|'end'; numeric?: boolean; width?: number; sortable?: boolean; hideOnMobile?: boolean; mobilePrimary?: boolean }
type IndexTableProps<T> = { rows:T[]; columns:Column<T>[]; getId:(r:T)=>string; onRowClick?:(r:T)=>void; selectable?:boolean; bulkActions?:Action[]; promotedBulkActions?:Action[]; loading?:boolean; emptyState?:ReactNode; pagination?:{ hasPrevious:boolean; hasNext:boolean; label:string; onPrevious():void; onNext():void } }
```
- **En-têtes** : 36px, fond `--color-surface-secondary`, 12px/550 gris, `padding 0 12px`, `nowrap`. Colonne triée : « Date ↓ ».
- **Lignes** : min. 40px, `padding 6px 12px`, séparateur 1px `--color-border-secondary` (pas sur la dernière), survol `--color-surface-secondary`, **toute la ligne est cliquable** (`onRowClick`) sauf la case à cocher et les éléments interactifs (`stopPropagation`).
- **Première colonne métier en gras** (`--color-text-strong`, 600) : n° de commande, nom du produit ou du client.
- **Case à cocher** : 16×16, radius 5px, bordure 1.5px `#b5b5b5`. Cochée : fond noir et coche blanche. Case d'en-tête : tout / rien / indéterminé.
- **Sélection** : la ligne prend le fond `--color-surface-selected`. Une **barre d'actions groupées** remplace les en-têtes : « N sélectionné(s) », actions promues (ex. « Marquer comme traitées », « Imprimer les bons de livraison »), puis menu « ⋯ ».
- **Colonnes numériques** alignées à droite, `tabular-nums`.
- **Vignette produit** 40×40, radius 8px, bordure `--color-border` (32px en table de stock et de fichiers).
- **Pagination** en pied (fond `--color-surface-secondary`, bordure haute, 12px gris) : « ‹ » « 1-50 » « › », boutons 28×28. Pagination par curseur si l'API le permet, 50 lignes par page.
- **Chargement** : 8 lignes skeleton (barres de 12px, radius 6px, shimmer de 1,2s).
- **Desktop étroit** : `overflow-x:auto` sur le conteneur de table, en-têtes et cellules `nowrap`.
- **Mobile** : voir §13.4.

### 7.6 MetricsStrip
- Carte horizontale. Cellule période à gauche (icône calendrier 16px + « Aujourd'hui » / « 30 jours », 550, bordure droite), puis N métriques séparées par des bordures.
- Chaque métrique contient :
  - un **libellé souligné en pointillés** (`border-bottom:1px dashed #b5b5b5`), qui affiche au survol une **infobulle de définition** (ex. « Taux de vente : unités vendues / unités reçues sur la période ») ;
  - la valeur (550, forte) ;
  - un delta (`↗ 75 %` vert `--badge-success-text`, ou `↘ 7 %` gris), en `nowrap` ;
  - une sparkline de 64×22 (trait 1.6px `--chart-primary`).
- La cellule période ouvre un sélecteur de période (Aujourd'hui, Hier, 7 jours, 30 jours, 90 jours, Personnalisé) qui met à jour toutes les métriques.
- Débordement : défilement horizontal, cellules de 160–170px minimum.

### 7.7 EmptyState
- Carte avec `padding 48px 24px 56px` et contenu centré : illustration 200×150 (marge basse 20px), titre 14px/650, texte gris de 460px max (marge basse 16px), actions (secondaire puis primaire).
- Sous la carte, lien centré en gris : « En savoir plus sur les {sujet} » (le sujet en lien bleu).

### 7.8 Charts (SVG maison ou librairie légère)
Règles communes :
- Le texte des axes n'est **jamais déformé** : pas de `preserveAspectRatio="none"` sur un SVG contenant du texte. Utilise un viewBox à la largeur réelle mesurée (`ResizeObserver`) ou un rendu responsive.
- Grille horizontale : 3 lignes `--chart-grid` ; axe Y à gauche (10px `--chart-axis-text`, format compact « 14 k ») ; axe X avec 4 ou 5 labels.
- Série principale : 2px `--chart-primary`. Comparaison : 1.6px `--chart-compare` en pointillés `3 3`.
- **Infobulle au survol** : ligne verticale, point sur chaque série, carte avec date, valeur et comparaison en %.
- Légende centrée sous le graphique : pastille de 8px + libellé de période.

Types à fournir :
- `LineChart` (option `area` avec remplissage à 8 % d'opacité) ;
- `Sparkline` ;
- `DonutChart` (rayon 15.9 sur viewBox 42, épaisseur 5, valeur centrale + « FCFA », légende en liste) ;
- `HorizontalBar` (barre de 18px radius 3px `--chart-cyan` + valeur) ;
- `StackedBar` (barre de 34px multi-segments) ;
- `FunnelChart` (3 trapèzes `--chart-funnel-*`) ;
- `CohortHeatmap` (cellules 30px radius 4px, fond `rgba(42,111,219,α)` avec α proportionnel, texte blanc si α > .5) ;
- `DotGlobe` (carte en points, continent `--map-land`, mer `--map-sea`, marqueurs de 6px violet = commandes / cyan = visiteurs, bordure blanche de 2px).

### 7.9 SettingsRow / ResourceList
- Ligne : `padding 12px 16px`, bordure haute (sauf la première), icône 16px + bloc titre (550 fort) et sous-titre (12px gris) + élément droit (valeur grise, badge, toggle ou bouton) + chevron `--color-text-subdued`. Survol `--color-surface-secondary` si la ligne est cliquable.

### 7.10 Formulaires
- **Field** : label (13px, fort, marge basse 4px), input de 32px (bordure 1px `--color-border-input`, radius 8px, fond `#fdfdfd`, `padding 0 10px`). Focus : bordure `#1a1a1a` + anneau 1px. Erreur : bordure `#c70a24` + message 12px rouge avec icône. Texte d'aide en 12px gris.
- **Textarea** : 72px minimum, redimensionnable verticalement.
- **Select** natif stylé de la même façon.
- **Checkbox** (§7.5), **Radio** (16px, cercle).
- **Toggle** : 32×18, fond `#b5b5b5`, pouce blanc de 14px ; actif : fond `#1a1a1a`, pouce à droite ; transition de 150ms ; `role="switch"` + `aria-checked`.
- **Barre d'enregistrement contextuelle** : dès qu'un formulaire de fiche est modifié, une barre noire apparaît en haut de la zone de contenu (« Modifications non enregistrées » + « Ignorer » + « Enregistrer »). Elle bloque la navigation (avec confirmation) tant qu'elle n'est pas résolue. C'est le pattern standard de la référence : **obligatoire sur toutes les fiches éditables**.

### 7.11 Banner
- Radius 10px, `padding 10px 12px`, icône info 16px, texte, lien souligné, action secondaire optionnelle à droite, fermeture ✕ optionnelle.
- Tons : `info`, `warning`, `critical`, `success`.

### 7.12 Overlays
- **Modal** : 620px de large (`sm` 440px, `lg` 840px), 80vh maximum, radius 14px, `--shadow-modal`, voile noir à 50 %.
  - En-tête collant (titre 650, bouton ✕), corps (padding 16px), pied (actions à droite, bordure haute).
  - Fermeture par Échap, clic sur le voile ou ✕. Focus piégé et restitué à la fermeture.
- **BottomSheet** (mobile) : pleine largeur, radius 16px en haut, 88vh maximum, poignée de glissement.
- **Popover / Menu** : `--shadow-popover`, radius 10px, items de 32px, navigation au clavier.
- **Tooltip** : fond `#1a1a1a`, texte blanc 12px, radius 6px, délai de 300ms.
- **Toast** : fond `#1a1a1a`, texte blanc 550, radius 10px, `padding 9px 14px`, centré à 76px du bas. Entrée : translateY 20px → 0 + fondu en 200ms. Durée 2,2s (5s s'il contient une action « Annuler »).

### 7.13 Autres composants
- **Timeline** : point de 9px gris ; le dernier événement est vert avec un halo `0 0 0 3px #cdfee1` ; texte ; heure à droite en 12px gris ; champ « Laisser un commentaire » en tête pour les fiches.
- **Avatar** : cercle de 28px avec initiales ; couleur dérivée du hash du nom.
- **Thumbnail** : 24, 32, 40 ou 72px.
- **Tabs** (onglets de page, ex. WhatsApp : Aperçu / Messages / Diffusions / Paramètres) : texte 13px, onglet actif en 600 avec soulignement de 2px noir, bordure basse globale de 1px.
- **Skeleton** : `SkeletonPage`, `SkeletonCard`, `SkeletonTable`, `SkeletonText`.
- **KeyValue** : lignes « libellé … valeur » (ventilation des ventes, totaux de commande).

---

## 8. SPÉCIFICATIONS ÉCRAN PAR ÉCRAN

> Les textes indiqués entre guillemets sont **les libellés exacts** à utiliser (via i18n). Les données d'exemple viennent du prototype et ne servent qu'aux mocks.

### 8.1 Accueil `/admin`
Conteneur `narrow`, **sans PageHeader**. De haut en bas :

1. **Barre KPI** (`padding-top:14px`, flex, gap 36px, `nowrap`) :
   - à gauche, « **30 derniers jours** · Tous les canaux » (deux menus déroulants : période et canal) ;
   - au centre, 4 KPI (libellé gris au-dessus, valeur forte avec delta et sparkline mini) : « Visites », « Ventes totales », « Commandes », « Taux de conversion » ;
   - à droite, « Visiteurs en direct **N** » avec anneau vert de 9px, lien vers Vue en direct.
2. **Hero** (marge 56px en haut, 28px en bas, centré, `display-home`) : « Bonjour {prénom} ! » + saut de ligne + « Continuons à développer votre entreprise. ».
3. **Champ AXIA** (640px max, radius 16px, `--shadow-ask`, `padding 14px 14px 10px`) :
   - textarea sans bordure de 42px, placeholder « Demandez à AXIA : « Quels produits relancer cette semaine ? » ». Entrée = envoyer, Shift+Entrée = nouvelle ligne.
   - Barre basse : avatar AXIA 22px à gauche ; à droite « Récents » (historique), séparateur, boutons + (joindre un fichier ou un produit), micro (dictée), vocal.
   - L'envoi ouvre le panneau AXIA avec la question.
4. **Chips d'action** (centrées, gap 8px, marge 16px en haut et 56px en bas) : radius 12px, 34px, bordure 1px, texte 500 + compteur dans une pastille grise. Chips calculées dynamiquement et masquées si leur compteur vaut 0 :
   - « Traiter les commandes » (non traitées) → `/admin/orders?view=unfulfilled` ;
   - « Confirmer les paiements à la livraison » → `/admin/orders?view=cod_unpaid` ;
   - « Relancer les paniers » → `/admin/checkouts`.
5. **Fil de recommandations** : grille de 3 colonnes, 940px max, gap 16px. **FeedCard** : radius 14px, padding 8px, vignette de 140px (radius 10px), pastille « 0 tâche terminée » (ou « N/M tâches terminées ») en haut à gauche pour les cartes de type tâche, ✕ de masquage au survol (persisté côté serveur ou en localStorage), titre 13px/650, texte 12px/17px gris, bouton secondaire `sm` en bas.

   Cartes, dans cet ordre (affichage conditionnel selon l'état de la boutique) :

   | # | Type | Titre | Texte | Action |
   |---|---|---|---|---|
   | 1 | tâche | Améliorez votre taux de conversion | Augmentez la part de visiteurs qui achètent… parcours de commande en 3 étapes. | Démarrer → checkout |
   | 2 | setup | Activer Mobile Money | Acceptez MTN Mobile Money et Orange Money en plus du paiement à la livraison. Encaissement sous 24 h. | Activer les paiements → settings/payments |
   | 3 | setup | Obtenez un domaine correspondant à {boutique} | Nous avons trouvé des noms de domaine disponibles… | Choisir un domaine → settings/domains |
   | 4 | setup | Vérifier les tarifs de livraison | Passez en revue les zones Douala, Yaoundé et villes secondaires… | Vérifier les tarifs → settings/shipping |
   | 5 | insight | Les visites en provenance de {ville} ont baissé de {x} % | phrase avec chiffres avant/après | Afficher le rapport (vignette = courbe + comparaison) |
   | 6 | insight | {produit} : ventes en hausse de {x} % | phrase avec montants avant/après | Afficher le rapport |
   | 7 | canal | Vendez directement sur WhatsApp | Synchronisez votre catalogue avec WhatsApp Business… | Connecter WhatsApp |
   | 8 | guide | Augmenter la visibilité et la conversion avec des applications | … | Consulter le guide (ouvre le catalogue d'applis) |
   | 9 | tâche | Réalisez vos 100 premières ventes | Frais de transaction offerts sur vos 100 premières commandes… | Démarrer |

6. Le **dock AXIA est masqué** sur l'accueil.

### 8.2 Commandes `/admin/orders`
- **Header** : « Commandes » (icône orders) ; secondaires « Exporter », « Plus d'actions ⌄ » ; primaire « Créer une commande » (→ commande provisoire).
- **MetricsStrip** (période « Aujourd'hui ») : Commandes · Articles commandés · Retours · Commandes traitées · Commandes livrées (valeur + delta + sparkline).
- **Vues** : Toutes · Non traitées · Non payées · Ouvertes · Archivées, plus « + » pour enregistrer une vue.
- **Colonnes** : ☐ | Commande (#1210, gras) | Date ↓ (« Aujourd'hui à 14:48 », « Hier à 13:40 », « lundi à 07:17 », « le 12 nov. à 09:15 ») | Client | Canal (Commande WhatsApp, Boutique en ligne, Formulaire COD, Facebook & Instagram) | Total (droite, FCFA) | Statut du paiement (badge) | Statut du traitement (badge) | Articles (« 3 articles », avec un popover de détail au survol) | Mode de livraison | Étiquettes (masquable).
- **Actions groupées** : Marquer comme traitées · Marquer comme payées · Imprimer les bons de livraison · Envoyer une confirmation WhatsApp · Ajouter des étiquettes · Archiver · Exporter.
- **Filtres** : Statut du paiement, Statut du traitement, Canal, Moyen de paiement (MoMo / OM / COD / Carte), Ville, Date, Montant, Étiquettes, Risque.
- Le clic sur une ligne ouvre la fiche commande.

### 8.3 Fiche commande `/admin/orders/:id`
- **Header** : ‹ retour + « #1205 » + badges paiement et traitement ; méta sous le titre : « {date} · {canal} » ; secondaires « Rembourser », « Modifier », « Imprimer ⌄ », « Plus d'actions ⌄ » ; flèches précédent/suivant (navigation entre commandes) à droite.
- **Colonne gauche** :
  1. **Carte Traitement** : badge « Non traitée » + mode de livraison. Pour chaque ligne : vignette 40px, titre produit (lien bleu), variante ou catégorie en gris, « prix × qté », total aligné à droite. Pied : « Créer une étiquette d'expédition » (secondaire) + « Marquer comme traitée » (primaire).
  2. **Carte Paiement** : badge de statut ; lignes KeyValue Sous-total (N articles), Réduction (code), Livraison (mode), Taxes, **Total** (gras) ; séparateur ; « Montant à encaisser à la livraison » ou « Payé par le client » ; pied : « Envoyer un lien MoMo » (secondaire) + « Marquer comme payée » (primaire).
  3. **Carte Chronologie** : champ de commentaire, puis événements (commande passée via le canal, confirmation WhatsApp envoyée, analyse de risque AXIA, paiement, expédition, livraison, refus).
- **Colonne droite** :
  1. **Notes** (édition au crayon).
  2. **Client** : nom (lien), « N commandes » ; Coordonnées (téléphone +237 cliquable, bouton WhatsApp) ; Adresse de livraison (nom, quartier et repère, ville, Cameroun) ; Adresse de facturation (« Identique à l'adresse de livraison »).
  3. **Risque de commande** : barre de 6px en 3 segments (Faible / Moyen / Élevé), texte « Faible · analyse AXIA », lien « Voir les détails ».
  4. **Étiquettes** (input à jetons).

### 8.4 Commandes provisoires `/admin/draft_orders`
- **Vide** : illustration brouillon, « Créer manuellement des commandes et des factures », « Utilisez les commandes provisoires pour prendre des commandes reçues par téléphone ou WhatsApp, envoyer des factures aux clients et percevoir des paiements Mobile Money. », primaire « Créer une commande provisoire », lien « En savoir plus sur la création de commandes provisoires ».
- **Non vide** : IndexTable (Brouillon #D12 | Date | Client | Statut [Ouverte / Facture envoyée / Terminée] | Total).
- **Création** : fiche en 2 colonnes (Produits avec recherche et « Parcourir », Paiement avec « Envoyer la facture » / « Collecter le paiement », Client, Marchés, Étiquettes).

### 8.5 Paniers abandonnés `/admin/checkouts`
- **Header** : « Paniers abandonnés » + sélecteur « Incomplets ⌄ » ; secondaire « Exporter ».
- **Colonnes** : Paiement (#35841811165758) | Date de création | Nom du client | Région | Statut de récupération (badge) | Total.
- **Carte AXIA** sous la table : « Relance automatique par WhatsApp » + texte + bouton « Activer ».

### 8.6 Produits `/admin/products`
- **Header** : « Produits » ; secondaires « Afficher en tant que » (icône œil), « Importer », « Exporter », « Plus d'actions ⌄ » ; primaire « Ajouter un produit ».
- **MetricsStrip** (30 jours) : « Taux de vente moyen » · « Produits par jours de stock restants » · « Analyse ABC des produits » (3 valeurs soulignées de couleurs différentes : A bleu, B violet, C cyan).
- **Vues** : Tous · Actifs · Brouillon · Archivés.
- **Colonnes** : ☐ | vignette | Produit (gras, 2 lignes maximum avec ellipsis) | Statut | Stock (« 42 en stock », en rouge sous le seuil, « Stock non suivi ») | Catégorie | Canaux (nombre) | Type de produit | Fournisseur.
- **Actions groupées** : Définir comme actif / brouillon · Archiver · Ajouter à la collection · Modifier les produits (éditeur en masse) · Supprimer.

### 8.7 Fiche produit `/admin/products/:id` et `/new`
- **Colonne gauche** :
  1. Titre + Description (éditeur riche : gras, italique, liste, lien, image) + lien « Générer une description avec AXIA ».
  2. Supports multimédias : zone de dépôt en pointillés, « Importer un nouveau fichier » + « Sélectionner un fichier existant », grille réordonnable par glisser-déposer.
  3. Catégorie.
  4. Prix : Prix, Prix avant réduction, Coût par article ; calcul affiché de la Marge et du Bénéfice ; case « Facturer la taxe sur ce produit ».
  5. Stock : case « Suivre la quantité », quantité par emplacement, SKU, code-barres, « Continuer à vendre en cas de rupture ».
  6. Expédition : « Produit physique », poids (kg).
  7. Variantes : options (Taille, Couleur, Tissu), tableau des variantes.
  8. Référencement (aperçu Google).
- **Colonne droite** : Statut (Actif / Brouillon) ; Publication (canaux avec coches : Boutique en ligne, WhatsApp Business, Facebook & Instagram, Agentique) ; Organisation du produit (Type, Fournisseur, Collections, Étiquettes) ; Modèle de thème.
- **Barre d'enregistrement contextuelle** obligatoire (§7.10).

### 8.8 Collections · Stock · Bons de commande · Transferts · Cartes-cadeaux
- **Collections** : table avec vignette 32 | Titre | Produits | Conditions (grisé, ex. « Catégorie est égale à … ») | Canaux de vente. Primaire « Ajouter une collection ».
- **Stock** : sélecteur d'emplacement dans le header (« Entrepôt Akwa ⌄ ») ; secondaires « Comptages de stock », « Exporter », « Importer ». Colonnes : vignette 32 | Produit | SKU | Indisponible | Engagé | **Disponible (input éditable inline, enregistré à la perte du focus avec un toast)** | En stock.
- **Bons de commande** : barre de filtres + état vide « Gérez vos bons de commande » / « Suivez et recevez le stock commandé auprès de vos fournisseurs, grossistes ou importateurs. » / « Créer un bon de commande ».
- **Transferts** : état vide « Déplacer le stock entre les emplacements » + « Créer un transfert » + lien.
- **Cartes-cadeaux** : header avec « Exporter » désactivé ; état vide « Commencez à vendre des cartes-cadeaux » + secondaire « Créer une carte-cadeau » + primaire « Ajouter un produit carte-cadeau ».

### 8.9 Clients · Segments · Entreprises
- **Clients** : secondaires « Exporter », « Importer » ; primaire « Ajouter un client ».
  - Carte récapitulative : « {N} clients · 100 % de votre base clients ».
  - Éditeur de segment en langage naturel (« Décrivez votre segment, ex. « clients de Douala ayant commandé 2 fois » », traité par AXIA, qui renvoie une requête de segment).
  - Table : Nom du client (gras) | Abonnement aux e-mails/WhatsApp (badge Abonné / Non abonné) | Emplacement (« Bastos, Yaoundé, Cameroun ») | Commandes | Montant dépensé.
- **Fiche client** : en-tête avec avatar ; cartes Dernière commande, Chronologie, puis à droite Client (contact, marketing), Adresse par défaut, Étiquettes, Notes. Indicateurs : montant dépensé, nombre de commandes, client depuis, taux de refus COD.
- **Segments** : table Nom du segment | % de clients | Dernière activité | Auteur. Primaire « Créer un segment ».
- **Entreprises** : état vide B2B « Apportez la puissance de la personnalisation à votre activité B2B » + « Ajouter une entreprise ».

### 8.10 Croissance `/admin/growth`
1. **Bandeau Autopilot** (carte de padding 24px, ✕ en haut à droite) : titre 20px/650 « Gérez votre marketing en pilote automatique », texte, « Démarrer » (primaire) + « En savoir plus » (tint), visuel à droite.
2. Ligne « Performance marketing » (h2) + sélecteur « 30 derniers jours ⌄ » + lien « Afficher les détails » (→ attribution).
3. Carte « Ventes attribuées au marketing » : valeur forte + « sur X FCFA de ventes totales » + LineChart de 240px de haut avec légende de période.
4. Grille de 3 colonnes : « Visites par type de trafic » (légende Payant / Organique / Direct + StackedBar) · carte Facebook (visites + ventes) · carte WhatsApp (visites + ventes).
5. Carte « Autopilot » (texte + « Démarrer ») et carte « Campagnes récentes » (texte + « Créer une campagne »).

### 8.11 Attribution `/admin/growth/attribution`
- **Header** : « Attribution » + sélecteur « Performance ⇅ ».
- **Barre de filtres** : « 30 derniers jours ⌄ », plage de dates « 19 oct. – 18 nov. 2026 ⌄ », puis à droite modèle d'attribution « Dernier clic non direct ⇅ » et « Trafic marketing ⇅ ».
- **4 KPI** (cartes) : Ventes totales · Commandes · Valeur moyenne du panier · Visites, chacun avec sa sparkline.
- **Carte « Canaux de marketing les plus performants »** + « Tout afficher ». Table sans cases à cocher : Canal (icône + nom) | Type de trafic | Total des ventes | Visites | Commandes | Conversion | Dépenses pub | ROAS | CPA | CAC | Impressions. Afficher « — » quand la valeur ne s'applique pas.

### 8.12 Autopilot `/admin/growth/autopilot`
- **Header** : « Campaign Autopilot ». Grille 1.6fr / 1fr, gap 40px.
- **Gauche** :
  - Paragraphe 22px/31px 550 : « Le pilote automatique analyse l'historique de votre **catalogue**, de votre **tarification**, de vos **marges bénéficiaires** et de vos **ventes** pour identifier les tendances de performance et découvrir des opportunités de croissance pour votre boutique. ».
  - « Actions en attente » + compteur, puis carte de lignes : icône du canal, titre « Connecter le canal Meta Ads » / « Connecter WhatsApp Business » / « Connecter TikTok Ads », description, bouton primaire `sm` « Connecter », ✕ pour masquer.
  - « Activité » (icône historique), « Aujourd'hui », puis Timeline (dernier événement vert).
- **Droite**, « Configuration » :
  - Régions (Cameroun), Langues (Français, Anglais) ;
  - « + Retour sur les dépenses publicitaires cible », « + Coût d'acquisition client » ;
  - Autorisations : « Gérer les éléments approuvés ⇅ » ;
  - « Se connecter à un canal ⓘ + ».

### 8.13 Campagnes `/admin/growth/campaigns`
- Pastille « ⚡ N activités non attribuées ».
- Carte « Campagnes » (tri) contenant un état vide horizontal : « Centralisez le suivi de vos campagnes » + texte (publications Facebook, diffusions WhatsApp, actions terrain : affiches, radio, marchés) + « Créer une campagne » + « En savoir plus » + illustration.

### 8.14 Réductions `/admin/discounts`
- Secondaire « Exporter » ; primaire « Créer une réduction ». Celui-ci ouvre une **modale de choix du type** : Montant sur les produits · Montant sur la commande · Achetez X obtenez Y · Livraison gratuite.
- **Vues** : Toutes · Actives · Programmées · Expirées.
- **Colonnes** : Titre (code en gras + résumé gris sur 2 lignes) | Statut | Méthode (Code / Automatique) | Admissibilité | Type | Cumuls (icônes de combinaison) | Utilisations.

### 8.15 Contenu
- **Métaobjets** : secondaire « Gérer » ; primaire « Ajouter une définition ».
  - Grille 1fr / 1fr / 1.6fr : 4 tuiles de stats (Disponible sur la boutique, Pages web, Actif, Brouillon) + carte « Entrées récentes » (liste nom / définition + « Afficher les N entrées »).
  - Puis carte avec filtres « Personnalisé ⇅ » et recherche « Recherche dans les définitions de métaobjet… », avec état vide « Aucune définition trouvée » / « Essayez de modifier les filtres ou le terme de recherche ».
- **Fichiers** : la sidebar principale est remplacée par un **panneau de dossiers** (« ‹ Retour », arborescence « Fichiers », « Nouveau dossier »). Header avec « ⋯ », « Nouveau dossier », primaire « + Fichiers » (upload multiple + glisser-déposer sur toute la page).
  - Colonnes : vignette 32 | Nom du fichier | Texte alternatif | Date d'ajout ↓ | Taille | Références (« 1 produit », « 2 références ⌄ », « 1 thème »).
  - Actions de ligne au survol : remplacer, copier le lien.
- **Menus** : secondaire « Redirections d'URL » ; primaire « Créer un menu ». Table sans cases : Menu ↓ | Éléments de menu.
- **Articles de blog** : en-tête avec « Gérer les blogs » ; état vide « Rédiger un article de blog » + « En savoir plus » + « Créer un article de blog ».

### 8.16 Marchés
- **Marchés** : secondaire « Vue graphique » ; primaire « Créer un marché ».
  - Barre : bouton panneau + « Rechercher dans tous les marchés » + filtres + tri.
  - Table : Marché ↑ (icône globe + nom) | Statut | Conditions (drapeau + pays) | Personnalisations (devise, langues).
  - Lignes de suggestion IA en violet (`--color-magic-*`) : « ✦ Créer le marché Afrique de l'Ouest (UEMOA) + » et « … Diaspora — France et Belgique + », avec ✕ pour masquer.
- **Catalogues** : header avec « Exporter » et « Importer » désactivés et primaire « Créer un catalogue » ; état vide « Personnalisez l'expérience d'achat avec les catalogues ».
- **Déploiements** : grille de 2 colonnes.
  - Gauche : titre 24px « Planifiez et testez des modifications sur votre boutique en ligne », texte + « En savoir plus » (gras), « + Créer un déploiement », 3 lignes avec icône séparées par des bordures (Planifier…, Configurer des événements à durée limitée…, Mener une expérimentation…).
  - Droite : visuel de calendrier Gantt (dates, barres colorées Lancement / Événement / Traitement / Témoin, minuteur « 00 : 12 Déploiement démarré »).

### 8.17 Analyses de données `/admin/analytics`
- **Header** : « Analyses de données » + méta « Actualisation aujourd'hui à 16:09 » ; « ⋯ », « Essayer les objectifs ⌄ » ; primaire « Nouvelle exploration ».
- **Bannière info** (refermable).
- **Filtres** : « Aujourd'hui ⌄ » (période), « 17 nov. 2026 ⌄ » (comparaison), « FCFA XAF » (devise). Le choix se reflète dans l'URL.
- **Carte « Informations »** (grille 260px / 1fr) : à gauche, liste d'insights cliquables (icône tendance + libellé tronqué, item actif sur fond gris) ; à droite, détail (date, titre avec flèche, texte explicatif chiffré, « Voir pourquoi », qui ouvre AXIA) + courbe.
- **4 KPI** : Ventes brutes · Taux de clients récurrents · Commandes traitées · Commandes (valeur, delta, sparkline pleine largeur).
- **Grille 2fr / 1fr** : « Ventes totales au fil du temps » (LineChart de 240px, comparaison en pointillés, légende des 2 périodes) + « Ventilation des ventes totales » (KeyValue : Ventes brutes, Réductions, Retours, Ventes nettes, Frais de livraison, Taxes, **Ventes totales** ; libellés en liens bleus vers les rapports).
- **Grille de 3 colonnes** : « Ventes par canal » (Donut + légende %) · « Visites au fil du temps » · « Ventes totales par produit » (HorizontalBar ×5).
- **Grille 1.6fr / 1fr** : « Analyse de cohorte de clients » (CohortHeatmap, mois 0 à 7) + « Visites par page de destination » (chemin | valeur | delta).
- Autres cartes en dessous : Taux de conversion au fil du temps (avec entonnoir Visites → Ajouté au panier → Paiement atteint → Payé), Visites par appareil (donut Mobile / Ordinateur), Visites par emplacement, Visites par référent de réseaux sociaux, Performance par canal de marketing, **Ventes par moyen de paiement (MoMo / OM / COD / Carte)**, **Taux de refus à la livraison par ville**.
- Toutes les cartes sont réorganisables et masquables (« Modifier le tableau de bord »). Chaque titre de carte mène au rapport détaillé.

### 8.18 Rapports `/admin/analytics/reports`
- Primaire « Nouvelle exploration » ; recherche « Rechercher des rapports » ; tri.
- Table sans cases : Nom (gras) | Catégorie | Dernière consultation ↓ | Créé par (AXSO / utilisateur) | icône épingler.
- Catégories : Performance, Acquisition, Clients, Commandes, Ventes, Stock, Marketing, Paiements, Livraison.
- **Rapports AXSO spécifiques à inclure** : Visites depuis WhatsApp · Taux de refus à la livraison (COD) · Délais de livraison par ville · Ventes par moyen de paiement · Rapprochement Mobile Money · Performance des livreurs.
- **Fiche rapport** : éditeur d'exploration (requête visuelle : métriques, dimensions, filtres, période, comparaison), graphique + tableau, « Enregistrer », « Exporter CSV ».

### 8.19 Vue en direct `/admin/analytics/live`
- **Header** : « Vue en direct » + « ● À l'instant » ; à droite, recherche « Rechercher un emplacement », œil (masquer les panneaux), plein écran.
- **Grille 380px / 1fr**.
- **Gauche** :
  - 4 KPI en 2×2 : Visiteurs en ce moment · Ventes totales · Visites · Commandes, avec sparklines ;
  - « Comportement des clients » (Paniers actifs / Au paiement / Achat effectué + entonnoir) ;
  - « Visites par emplacement » (barres par ville) ;
  - « Nouveaux clients et clients récurrents » (StackedBar) ;
  - « Ventes totales par produit ».
- **Droite** : carte de 600px de haut minimum, fond radial très clair, **DotGlobe centré sur l'Afrique** (Cameroun au centre), marqueurs animés (pulsation de 2s) pour les visiteurs et commandes en temps réel, légende en bas à droite, boutons zoom + / −.
- Rafraîchissement temps réel : WebSocket si disponible, sinon polling de 10s.

### 8.20 Boutique en ligne `/admin/online_store`
- **Header** : « Boutique en ligne » ; « 👁 Public ⌄ » (statut : Public / Protégé par mot de passe), « Afficher la boutique » (ouvre `{domaine}` dans un nouvel onglet), « ⋯ ».
- **MetricsStrip** (30 jours) : LCP P75 (ms + badge), INP P75 (+ badge), CLS, Visites.
- **Carte du thème actuel** : grand aperçu (capture ou iframe de la page d'accueil), ligne vignette + « {Nom du thème} » + badge « Thème actuel » + « Ajouté le … · Version x.y.z » + « ⋯ » + primaire « Personnaliser » (→ éditeur de thème).
- « Bibliothèque de thèmes » + « Ajouter un thème ⌄ » : lignes de thème non publiées (« Publier », « Personnaliser »).
- « Découvrir des thèmes » + « Visiter la boutique de thèmes » : grille de 3 thèmes AXSO (aperçu, nom, « par AXSO · {verticale} », « Ajouter »).
- **Pages** : table Titre | Visibilité (badge Visible / Masquée) | Contenu (extrait gris) | Mise à jour ↓ ; primaire « Ajouter une page ».
- **Préférences** (conteneur `thin`) : « Accès à la boutique » (Mode privé, B2B uniquement, avec toggles) ; « Image de partage et SEO » (zone image 1200×628 + aperçu, Titre de la page d'accueil, Méta-description, liens « Traduire ») ; « Suivi et pixels » (Meta Pixel, TikTok Pixel, Google Analytics, avec badge d'état).

### 8.21 Agentique `/admin/channels/agentic`
- Grille 1.6fr / 1fr.
- **Gauche** :
  - titre 22px sur l'admissibilité de la boutique au commerce agentique ;
  - « Préparez-vous pour les vitrines agentiques » + carte de 2 checks (accès au catalogue, politiques à jour) avec chemin `/pages/livraison` en monospace ;
  - mention des conditions supplémentaires.
- **Droite** :
  - « Canaux » : toggle « Autoriser AXSO à gérer pour moi », puis liste ChatGPT, Microsoft Copilot, Google Gemini, AXIA, Autres canaux ;
  - « Sources » : Base de connaissances (« 6 sur 13 publiés »), Catalogue AXSO (badge Admissible / Non admissible ⌄).

### 8.22 WhatsApp Business `/admin/channels/whatsapp`
- **Onglets** : Aperçu · Messages · Diffusions · Paramètres.
- **Aperçu** (grille 2fr / 1fr) :
  - « Prochaines étapes pour votre catalogue » (état « Vous êtes à jour pour le moment. » avec check vert) ;
  - « Commandes depuis WhatsApp » + badge Actif + explication + lien « Envoyer une diffusion ↗ » ;
  - à droite, « Statut du catalogue » (badge Approuvé + N produits, « Voir les produits synchronisés », numéro associé).
- **Messages** : boîte de réception (liste des conversations + fil + panneau client avec ses commandes + création de commande depuis la conversation).
- **Diffusions** : table des campagnes (nom, segment, envoyés, lus, clics, ventes) + « Créer une diffusion » (modèle, segment, planification).
- **Paramètres** : numéro, profil professionnel, messages automatiques (confirmation, expédition, livraison, relance de panier), opt-in.

### 8.23 Facebook & Instagram `/admin/channels/social`
- **Header** : liens « Obtenir de l'aide », « Associer un compte Facebook » + « ⋯ ». Onglets Aperçu · Paramètres.
- **Aperçu** : « Prochaines étapes pour votre catalogue » ; « Diffuser des publicités sur Facebook et Instagram » + badge Actif + « Créer une publicité ↗ » ; à droite « Statut du produit » (Approuvé, N produits, lien, « Catalogue de produits associé ⌄ »).
- **Modale « Associez le compte Facebook que vous utilisez pour votre entreprise »** : visuel en haut (150px), titre 20px, texte, sections « 🔒 Confidentialité du compte » et « Autorisations », pied avec primaire « Associer le compte » + plain « Annuler ». Erreur de connexion : toast critique « Une erreur s'est produite lors de la connexion de votre compte. Veuillez réessayer. ».

### 8.24 Applications
- **Popover/modale « Applis »** (ouvert depuis « Applications › » de la sidebar) :
  - champ de recherche avec jeton « Applis ✕ » ;
  - section « Applis installées (N) » (icône 26px + nom, clic = ouvrir) ;
  - section « Sélectionnées pour vous » (icône 36px, nom, note ★, « Conçue pour AXSO », description, bouton installer) ;
  - pied : « Toutes les applis recommandées » · « Paramètres des applis ».
- Les **applications installées** s'affichent dans la sidebar sous « Applications » ; leurs sous-pages apparaissent quand l'app est active.
- **Formulaire COD** (app intégrée) :
  - Tableau de bord : KPI (Commandes COD 30 j, Taux de confirmation, Refus à la livraison, Montant à encaisser) ; aperçu du formulaire (Nom complet, Téléphone +237, Ville, Quartier/repère, bouton « Commander — paiement à la livraison ») ; toggles (Confirmation WhatsApp automatique, Vérification OTP, Bloquer les numéros à refus répétés, Proposer MoMo avant expédition).
  - Concepteur de formulaire (champs glisser-déposer, styles).
  - Prévention de la fraude : table Numéro masqué | Commandes | Refus | Statut (Bloqué / À surveiller).
  - Plans de facturation : 3 cartes (Gratuit / Pro / Business), plan recommandé encadré 2px noir.

---

## 9. PARAMÈTRES (LAYOUT DÉDIÉ + 19 SECTIONS)

### 9.1 Layout
- Toute route `/admin/settings/*` remplace la sidebar principale par la **SettingsSidebar** (270px, fond frame) :
  - « ‹ Paramètres » (retour à la dernière page admin visitée) ;
  - recherche « Rechercher dans les paramètres » (filtre les sections et les réglages, avec mise en surbrillance) ;
  - carte boutique (avatar, nom, domaine `xxx.axsoafrica.com`) ;
  - liste des 19 sections (icône 18px + libellé, item actif sur fond actif) ;
  - en bas, utilisateur connecté (avatar, nom, e-mail).
- Contenu en conteneur `thin` (720px). Titre de section 20px/650 avec 36px au-dessus et 18px en dessous.
- Sous-sections : titre 13px/650 + description grise, puis carte de SettingsRows.
- Les modifications passent par la **barre d'enregistrement contextuelle**.

### 9.2 Sections
1. **Général** :
   - en-tête avec le nom de la boutique + pastille « Santé du vendeur : Évaluation en cours » ;
   - carte de checklist (« Débloquez une bonne santé du vendeur… » : Ajouter les informations sur l'entreprise (RCCM, NIU), Traiter votre première commande) ;
   - Informations sur l'entreprise (entité, pays, RCCM) ;
   - Coordonnées de la boutique (nom, e-mail, téléphone, adresse) ;
   - Paramètres par défaut (Devise XAF, Unités métriques, Fuseau Afrique/Douala, Préfixe des commandes) ;
   - Ressources de marque (logo, couleurs) ;
   - Statut de la boutique (pause, fermeture).
2. **Forfait** : forfait actuel (nom, prix/mois, prochaine facture) + « Changer de forfait » ; 3 cartes (Démarrage / Croissance / Pro) avec limites et commission.
3. **Facturation** : moyen de paiement de l'abonnement (MoMo / carte), factures (table), crédits.
4. **Utilisateurs** : propriétaire, liste du personnel (avatar, nom, rôle et permissions), « Ajouter des utilisateurs » ; rôles personnalisés ; profils livreurs à accès restreint.
5. **Paiements** : bannière, « Fournisseurs de paiement » (MTN Mobile Money, Orange Money, Paiement à la livraison, Cartes bancaires, Wave bientôt) avec badge d'état et chevron vers la configuration (numéro marchand, frais, délai de versement) ; « Capture des paiements » (toggle) ; « Moyens de paiement manuels ».
6. **Paiement (checkout)** : toggles (Parcours en une page, Téléphone obligatoire +237, Compte client facultatif, Pourboire livreur), champs du formulaire, messages, éditeur de style.
7. **Comptes clients** : connexion par téléphone + OTP, comptes facultatifs ou obligatoires.
8. **Expédition et livraison** :
   - Profils (bannière tarifs par quartier, « Par défaut de la boutique » / « Profil général » : Tous les produits · 1 emplacement · N zones, « + Ajouter un profil personnalisé ») ;
   - Zones et tarifs (Douala, Yaoundé, Autres villes, CEMAC) ;
   - Délais estimés ;
   - Partenaires de livraison (livreurs indépendants, agences de voyage, points relais) ;
   - Emballages ;
   - Livraison locale, Retrait en magasin, Points relais (badges d'état).
9. **Taxes et droits de douane** : « Rapports » en haut à droite ; « Service fiscal » (AXSO Tax, TVA 19,25 %) + « Gérer » ; « Régions fiscales » (table drapeau + pays | Perception).
10. **Emplacements** : entrepôts, boutiques et points relais (adresse, stock, expédition activée).
11. **Applications** : applications installées, permissions, développement d'applications.
12. **Canaux de vente** : canaux installés et disponibles.
13. **Domaines** : table Nom de domaine | Statut | Fournisseur ; « Connecter un domaine existant », « Acheter un domaine » (.cm, .com, .africa).
14. **Événements clients** : pixels et suivi (Meta, TikTok, Google), consentement.
15. **Notifications** : modèles clients (WhatsApp, SMS, e-mail) — confirmation, expédition, livraison, refus, relance ; notifications au personnel.
16. **Champs méta et métaobjets** : définitions par ressource.
17. **Langues** : français par défaut, anglais, traduction automatique.
18. **Confidentialité des clients** : bannière cookies, demandes de données.
19. **Politiques** : retour, remboursement, confidentialité, conditions, livraison (éditeur + modèle généré par AXIA).

---

## 10. AXIA (ASSISTANT IA)

- **Points d'entrée** :
  - champ de l'accueil ;
  - **dock flottant** (toutes les pages sauf l'accueil) : centré en bas à 18px (décalé de la moitié de la sidebar en desktop), 360×44px, radius 14px, ombre popover. Il contient l'avatar AXIA (22px, carré bleu nuit radius 7px, étoile jaune), « Travailler avec AXIA » (gris), boutons + / micro / vocal, séparateur, bouton « ouvrir le panneau » ;
  - liens contextuels (« Générer une description avec AXIA », « Voir pourquoi », éditeur de segment, score de risque) ;
  - bouton AXIA dans la barre mobile.
- **Panneau** : 400px à droite (plein écran en mobile), radius 14px, `--shadow-drawer`, translateX animé en 220ms.
  - En-tête : avatar + « AXIA » + ✕.
  - Fil de messages : utilisateur à droite en bulle `#f1f1f1` radius 12px ; AXIA à gauche sans bulle, avec markdown léger (listes, gras, liens internes vers des pages admin).
  - Zone de saisie : textarea de 60px avec bordure (focus noir).
- **Contexte** : AXIA reçoit la route courante et l'entité affichée (commande, produit, client) pour répondre en contexte.
- **Actions proposées** : boutons dans la réponse (« Appliquer à la fiche », « Envoyer la relance », « Créer la réduction »). **Toute action d'écriture demande une confirmation explicite.**
- **Streaming** des réponses ; états « AXIA analyse… », erreur (« AXIA n'est pas disponible pour le moment. Réessayer »), annulation.
- **Historique** (« Récents ») : conversations précédentes.
- Si l'API AXIA n'existe pas encore : interface `AxiaClient` + implémentation mock avec réponses déterministes, documentée.

---

## 11. RECHERCHE GLOBALE ET RACCOURCIS CLAVIER

- **CommandPalette** (Ctrl/Cmd+K, ou clic sur la recherche de la sidebar ou de la barre mobile) : modale de 600px.
  - Champ (icône loupe, placeholder « Rechercher des pages, commandes, produits, clients… », pastille « Échap »).
  - Résultats groupés : Pages · Commandes · Produits · Clients · Paramètres · Actions (« Créer un produit », « Créer une réduction »…).
  - Navigation ↑ ↓ ↵, survol et ligne active en `#f1f1f1`, debounce de 150ms, recherches récentes quand le champ est vide.
- **Raccourcis** :
  - `Ctrl/Cmd+K` : recherche ;
  - `Échap` : fermer la modale ou le panneau ;
  - `G` puis `H/O/P/C/A` : aller à Accueil / Commandes / Produits / Clients / Analyses ;
  - `Ctrl/Cmd+S` : enregistrer (barre contextuelle) ;
  - `J/K` : ligne suivante / précédente dans un IndexTable ;
  - `X` : cocher la ligne.
- `?` ouvre la modale d'aide des raccourcis.

---

## 12. ÉTATS SYSTÈME

- **Chargement** :
  - première visite d'une route : `SkeletonPage` (barre d'en-tête, MetricsStrip et table en skeleton) ;
  - rechargement de données : indicateur fin (barre de progression de 2px en haut de la zone de contenu) **sans** vider l'écran ;
  - jamais de spinner plein écran.
- **Vide** : EmptyState propre à chaque ressource (§8).
- **Recherche sans résultat** : « Aucun {ressource} trouvé » + « Essayez de modifier les filtres ou le terme de recherche » + « Effacer les filtres ».
- **Erreur** :
  - carte bannière critique « Impossible de charger les {ressource}. » + « Réessayer » ;
  - erreur d'action : toast critique + conservation de la saisie ;
  - 404 : page « Cette page est introuvable » + retour à l'accueil.
- **Permissions** : élément masqué si interdit (ou désactivé avec infobulle « Vous n'avez pas l'autorisation… ») ; page entière : état « Accès restreint ».
- **Hors ligne** : bannière warning collante « Vous êtes hors ligne. Les modifications seront synchronisées à la reconnexion. ». **Critique** pour le marché ciblé (connexions instables) : mets en cache les dernières listes consultées et mets les actions en file d'attente si la stack le permet.

---

## 13. RESPONSIVE (COMPORTEMENT DE LA PLATEFORME DE RÉFÉRENCE)

### 13.1 Points de rupture
`xs ≤ 480` · `sm ≤ 820` (mode mobile) · `md ≤ 1040` (tablette) · `lg ≤ 1440` · `xl > 1440`.

### 13.2 Tablette (≤ 1040px)
- Padding de page à 16px.
- MetricsStrip et barre KPI défilent horizontalement.
- Grilles de 4 colonnes sur 2 colonnes ; fil de l'accueil sur 2 colonnes.
- La sidebar reste visible.

### 13.3 Mobile (≤ 820px)
- **Barre supérieure** noire collante de 52px (`padding 0 8px`, gap 6px) :
  - ☰ (36×36, radius 10px) ;
  - champ « Rechercher » (flex 1, 34px, fond `#262626`, bordure `#333`, radius 10px), qui ouvre la palette ;
  - bouton AXIA ;
  - cloche avec badge ;
  - avatar boutique (lien vers les paramètres).
- **Sidebar en tiroir** : 290px depuis la gauche, translateX de −105 % à 0 en 220ms ease, voile `rgba(0,0,0,.45)`. Fermeture au clic sur un lien, sur le voile, par Échap ou par swipe vers la gauche. Même chose pour la SettingsSidebar.
- **Zone principale** plein écran, sans radius ni marge ; le body scrolle ; fond blanc.
- **PageHeader** collant sous la barre (top 52px), 52px de haut, titre 15px tronqué avec ellipsis.
  - **Seul le bouton primaire reste visible** ; secondaires, liens et méta passent dans le menu « ⋯ » (BottomSheet avec la liste des actions).
  - Le bouton retour ‹ reste visible sur les fiches.
- **Accueil** :
  - barre KPI défilante (toutes les KPI visibles par défilement) ;
  - hero 22px/29px ;
  - champ AXIA pleine largeur ;
  - **chips défilantes horizontalement** (pas de retour à la ligne, bords à bords) ;
  - fil sur 1 colonne.

### 13.4 IndexTable en mobile (liste de ressources condensée)
- **Pas d'en-têtes ni de cases à cocher** (sélection par appui long, qui affiche la barre d'actions groupées en bas).
- **Chaque ligne devient un bloc** (`padding 12px 14px`, séparateur) :
  - ligne 1 : la colonne `mobilePrimary` (n° de commande, nom du produit ou du client) en **gras, sur toute la largeur** ; vignette à gauche du titre pour les produits ;
  - lignes suivantes : les autres valeurs en ligne, en `flex-wrap`, gris 13px, gap 4×10px (date, client, canal, total) ;
  - les badges gardent leurs couleurs ;
  - les colonnes `hideOnMobile` sont masquées.
- Onglets de vues et barre de filtres **défilants horizontalement** sans scrollbar visible.

### 13.5 Autres règles mobiles
- **Toutes les grilles** sur 1 colonne ; layouts 2 colonnes empilés (colonne principale d'abord).
- **Modales → BottomSheet** (pleine largeur, radius 16px en haut, 88vh maximum) ; palette de commandes en plein écran.
- Panneau AXIA en plein écran ; **dock AXIA** pleine largeur à 12px des bords et du bas.
- Toast centré à 72px du bas.
- Cibles tactiles ≥ 36px (44px recommandé pour les actions primaires).
- `font-size ≥ 16px` sur les inputs pour éviter le zoom iOS.
- Gestion de `env(safe-area-inset-*)`.
- **Aucun débordement horizontal** à 360px.
- Tableaux d'analyse larges (Attribution, cohorte) : défilement horizontal **à l'intérieur de la carte** uniquement.

---

## 14. INTERACTIONS, ANIMATIONS, MICRO-COPIES

- **Durées** : survol et focus 100–150ms ; tiroir et panneau 220ms ease ; modale (fondu + scale .98 → 1) 180ms ; toast 200ms ; skeleton shimmer 1,2s linéaire infini.
- `prefers-reduced-motion` : désactiver les translations et pulsations.
- **Optimistic UI** sur les actions simples (marquer comme traitée ou payée, toggles, stock inline) avec rollback et toast d'erreur.
- **Confirmations destructives** : modale avec bouton `critical` (« Supprimer N produits ? Cette action est irréversible. »).
- **Toasts de succès** : courts, au participe passé (« Commande #1205 marquée comme traitée », « Produit enregistré », « Paiement enregistré », « 3 commandes archivées »), avec « Annuler » quand c'est réversible.
- **Ton** : vouvoiement, phrases courtes, verbes d'action en début de bouton (« Créer », « Ajouter », « Activer », « Connecter », « Marquer comme… »). Pas de points d'exclamation sauf dans « Bonjour {prénom} ! ». Pas de jargon technique.
- **Libellés de dates relatifs** : « Aujourd'hui à 14:48 », « Hier à 13:40 », jour de la semaine sur les 7 derniers jours (« lundi à 07:17 »), puis « le 12 nov. à 09:15 », puis « le 12 nov. 2025 » au-delà de l'année en cours.

---

## 15. MODÈLES DE DONNÉES TYPESCRIPT (pour typer l'UI et les mocks)

```ts
type Money = { amount: number; currency: 'XAF' };          // entier, en FCFA
type PaymentMethod = 'cod'|'mtn_momo'|'orange_money'|'card'|'wave'|'manual';
type FinancialStatus = 'pending'|'cod_pending'|'paid'|'partially_refunded'|'refunded'|'voided';
type FulfillmentStatus = 'unfulfilled'|'partial'|'fulfilled';
type DeliveryStatus = 'none'|'in_transit'|'delivered'|'refused';
type SalesChannel = 'online_store'|'whatsapp'|'cod_form'|'facebook_instagram'|'tiktok'|'agentic'|'pos'|'draft';

interface Address { name:string; phone:string; neighborhood?:string; landmark?:string; city:string; region?:string; country:'CM'|string }
interface Customer { id:string; firstName:string; lastName:string; phone:string; email?:string; city:string; ordersCount:number; totalSpent:Money; marketing:{ whatsapp:boolean; email:boolean; sms:boolean }; tags:string[]; createdAt:string; codRefusalRate?:number }
interface LineItem { id:string; productId:string; variantId?:string; title:string; variantTitle?:string; image?:string; quantity:number; unitPrice:Money; total:Money }
interface Order { id:string; name:string /* #1205 */; createdAt:string; channel:SalesChannel; customer:Customer; lineItems:LineItem[]; subtotal:Money; discount?:{ code:string; amount:Money }; shipping:{ method:string; price:Money }; tax:Money; total:Money; amountDue:Money; paymentMethod:PaymentMethod; financialStatus:FinancialStatus; fulfillmentStatus:FulfillmentStatus; deliveryStatus:DeliveryStatus; shippingAddress:Address; risk:{ level:'low'|'medium'|'high'; reasons:string[] }; tags:string[]; note?:string; timeline:TimelineEvent[] }
interface TimelineEvent { id:string; at:string; kind:'placed'|'whatsapp_sent'|'paid'|'fulfilled'|'delivered'|'refused'|'comment'|'axia'; message:string; author?:string }
interface Product { id:string; title:string; descriptionHtml:string; status:'active'|'draft'|'archived'; category?:string; productType?:string; vendor:string; media:{ url:string; alt?:string }[]; price:Money; compareAtPrice?:Money; cost?:Money; tracked:boolean; inventory:{ locationId:string; available:number; committed:number; unavailable:number }[]; channels:SalesChannel[]; tags:string[]; collections:string[] }
interface Metric { key:string; label:string; definition:string; value:number|Money; format:'number'|'money'|'percent'|'duration'; delta?:number /* +0.75 = +75 % */; series?:number[] }
interface AbandonedCheckout { id:string; createdAt:string; customerName:string; region:string; recovery:'not_recovered'|'reminder_sent'|'recovered'; total:Money }
interface Discount { id:string; code:string; summary:string; status:'active'|'scheduled'|'expired'; method:'code'|'automatic'; type:'amount_off_products'|'amount_off_order'|'buy_x_get_y'|'free_shipping'; eligibility:string; usageCount:number }
```

---

## 16. FORMATS ET LOCALISATION

- **Devise** : `formatMoney(n)` donne `1 234 567 FCFA` (séparateur de milliers = espace insécable U+00A0 ou fine U+202F, sans décimales). En format compact : `6,47 M FCFA`, `209,8 k FCFA`. En axes de graphique : `14 k`.
- **Nombres** : `fr-FR` (`7 960`, `45,35 %`, `0,7 %`).
- **Pourcentages** : virgule décimale, espace avant `%`. Deltas : `↗ 75 %` / `↘ 7 %`.
- **Dates** : `fr-FR`, fuseau `Africa/Douala` (UTC+1), formats relatifs du §14. Plages : `19 oct. – 18 nov. 2026`.
- **Téléphones** : `+237 6 XX XX XX XX` (affichage) ; stockage E.164 ; validation des préfixes MTN et Orange.
- **Adresses** : quartier + point de repère + ville (pas de code postal obligatoire).
- **i18n** : toutes les chaînes dans des fichiers de traduction (`fr.json` complet, `en.json` initialisé), pluriels gérés (« 1 article » / « 3 articles »).

---

## 17. ACCESSIBILITÉ (WCAG 2.1 AA)

- Contraste ≥ 4.5:1 pour le texte (vérifie les badges et les textes gris sur `--color-surface-secondary`).
- Focus visible partout (§7.1), ordre de tabulation logique, liens d'évitement « Aller au contenu ».
- `aria-label` sur tous les boutons icône, `aria-current="page"` sur l'item de nav actif, `aria-expanded` sur les menus et sections repliables, `role="switch"` sur les toggles.
- Tables : `<table>` sémantique en desktop, en-têtes `scope="col"`, tri annoncé (`aria-sort`).
- Modales : `role="dialog"`, `aria-modal`, focus piégé, restitution du focus à la fermeture.
- Graphiques : `role="img"` + `aria-label` résumant la tendance, et tableau de données accessible en alternative.
- Annonces live (`aria-live="polite"`) pour les toasts et les résultats de recherche.

---

## 18. PERFORMANCE

- Découpage du code par route (lazy), préchargement au survol des liens de la sidebar.
- Premier rendu d'une liste < 1,5s sur une connexion 3G rapide ; budget JS initial < 200 Ko gzip pour le shell.
- Virtualisation des tables au-delà de 200 lignes affichées.
- Images : vignettes servies en 80px (2×) au format WebP/AVIF, `loading="lazy"`.
- Police Inter en `font-display: swap`, sous-ensemble latin.
- Cache des requêtes (stale-while-revalidate) pour les listes, invalidation après mutation.

---

## 19. TESTS ET CONTRÔLE VISUEL

1. **Unitaires** (framework existant) : chaque composant du design system (rendu, variantes, interactions clés, accessibilité de base).
2. **E2E** (Playwright, à ajouter s'il est absent) — parcours critiques :
   - accueil → chip « Traiter les commandes » → liste filtrée → fiche → « Marquer comme traitée » → toast ;
   - Produits → Ajouter → remplir → barre contextuelle → Enregistrer ;
   - Ctrl+K → rechercher « #1205 » → ouvrir ;
   - mobile : ☰ → navigation → Commandes → menu « ⋯ » → action ;
   - Paramètres → Paiements → activer Orange Money.
3. **Régression visuelle** : pour chaque route, capture en **1376×860** et en **390×844** (et 768×1024 pour les écrans de liste). Compare-la avec la même route du prototype (`reference/axso-admin-prototype.html#<hash>`, voir la correspondance ci-dessous). Range les paires dans `docs/refonte-admin/SCREENSHOTS/<route>/{prototype,impl}-{desktop,mobile}.png`. Corrige tout écart visible (espacements, tailles, couleurs, alignements, hiérarchie) avant de passer à l'écran suivant.
4. **Correspondance des hash du prototype** :
   - `home`, `orders`, `order-1205`, `drafts`, `checkouts` ;
   - `products`, `product-0`, `product-new`, `collections`, `inventory`, `purchase-orders`, `transfers`, `gift-cards` ;
   - `customers`, `segments`, `companies` ;
   - `growth`, `attribution`, `autopilot`, `campaigns`, `discounts` ;
   - `metaobjects`, `files`, `menus`, `articles`, `markets`, `catalogs`, `rollouts` ;
   - `analytics`, `reports`, `live` ;
   - `online-store`, `pages`, `preferences`, `agentic`, `whatsapp`, `social` ;
   - `cod`, `cod-fraud`, `cod-plans` ;
   - paramètres : `p-general`, `p-plan`, `p-users`, `p-payments`, `p-checkout`, `p-shipping`, `p-taxes`, `p-domains` (et les autres `p-*`).
5. **Audit** Lighthouse et axe sur Accueil, Commandes, Fiche commande et Produits : accessibilité ≥ 95, performance ≥ 85 en mobile.

---

## 20. MÉTHODE DE TRAVAIL, COMMITS, LIVRABLES

| Lot | Contenu | Livrable | Commit |
|---|---|---|---|
| 1 | Audit et plan | `PLAN.md` | `docs(admin): audit et plan de refonte` |
| 2 | Tokens, typographie, icônes, illustrations | `tokens.*`, `icons/`, `illustrations/` | `feat(ds): tokens et iconographie` |
| 3 | Composants de base (§7.1–7.4, 7.9–7.13) | composants + `/admin/_ui` + tests | `feat(ds): composants de base` |
| 4 | IndexFilters, IndexTable, MetricsStrip, EmptyState, Charts | idem | `feat(ds): index table, metrics, charts` |
| 5 | AppShell, Sidebar, PageHeader, CommandPalette, AxiaDock et Panel, SettingsShell + responsive du shell | layout | `feat(admin): app shell et navigation` |
| 6 | Accueil | écran + e2e + captures | `feat(admin/home): …` |
| 7 | Commandes, fiche commande, brouillons, paniers | … | un commit par écran |
| 8 | Produits, fiche produit, collections, stock, BC, transferts, cartes-cadeaux | … | … |
| 9 | Clients, fiche client, segments, entreprises | … | … |
| 10 | Analyses, rapports, vue en direct | … | … |
| 11 | Paramètres (layout + Général, Paiements, Expédition, Taxes, Utilisateurs, Domaines, puis le reste) | … | … |
| 12 | Croissance, attribution, autopilot, campagnes, réductions | … | … |
| 13 | Contenu, marchés, catalogues, déploiements | … | … |
| 14 | Canaux (boutique en ligne, pages, préférences, agentique, WhatsApp, social) + applications et Formulaire COD | … | … |
| 15 | États système, hors ligne, raccourcis, accessibilité, performance, nettoyage de l'ancien code | rapport | `chore(admin): finitions et nettoyage` |

À la fin de **chaque lot** :
- mets à jour `CHANGELOG.md` (fait, mocks restants, dépendances back-end à créer, écarts connus) ;
- fais-moi un résumé de 5 lignes maximum avec les captures avant/après ;
- arrête-toi si une décision produit est nécessaire.

Supprime l'ancien code UI seulement quand le nouvel écran équivalent est livré et testé (pas de double maintenance prolongée). Utilise un feature flag `admin_v2` si la stack le permet, pour basculer progressivement.

---

## 21. CRITÈRES D'ACCEPTATION (CHECKLIST FINALE)

- [ ] Toutes les routes du §6 existent, sont navigables, deep-linkables, et la sidebar reflète la section et le sous-item actifs.
- [ ] Le design system est complet, documenté (`COMPONENTS.md`), visible sur `/admin/_ui`, sans aucune valeur en dur hors tokens.
- [ ] Chaque écran correspond visuellement au prototype en desktop et en mobile (paires de captures présentes).
- [ ] Le comportement mobile respecte le §13 à 360, 390, 768, 1040 et 1440px : tiroir, menu « ⋯ », listes condensées, bottom sheets, aucun débordement.
- [ ] Barre d'enregistrement contextuelle sur toutes les fiches éditables ; confirmations sur les actions destructives ; toasts sur toutes les mutations.
- [ ] CommandPalette et raccourcis fonctionnels.
- [ ] AXIA accessible depuis l'accueil, le dock, la barre mobile et les liens contextuels, avec contexte de page.
- [ ] États chargement / vide / erreur / permission / hors ligne implémentés partout.
- [ ] Formats FCFA, dates, téléphones +237 et i18n conformes au §16.
- [ ] Accessibilité ≥ 95 et performance mobile ≥ 85 (Lighthouse) sur les 4 écrans clés.
- [ ] Logique métier intacte : tous les tests existants et nouveaux au vert ; aucune modification d'API non demandée.
- [ ] Aucun élément de marque tierce.
- [ ] `PLAN.md`, `DECISIONS.md`, `CHANGELOG.md`, `COMPONENTS.md` et `SCREENSHOTS/` sont à jour.

---

## 22. ANTI-PATTERNS INTERDITS (ce qui « fait IA » ou amateur)

- Dégradés décoratifs (fonds, boutons, textes), glassmorphism, néons, ombres colorées.
- Boutons ou liens aux couleurs de la marque ; plusieurs boutons primaires sur un même en-tête.
- Emojis dans l'UI (sauf drapeaux de pays dans les tables de marchés et de taxes).
- Grandes cartes « hero » colorées sur les pages de liste ; icônes géantes ; illustrations 3D ou de personnages.
- Textes marketing creux (« Boostez votre business avec la puissance de l'IA 🚀 »).
- Coins trop arrondis (> 16px) sur les composants courants ; espacements irréguliers ; plus de 2 graisses de police dans un même bloc.
- Tables aérées à l'excès (lignes de plus de 56px), cartes KPI géantes, graphiques décoratifs sans axe ni valeur.
- Spinners plein écran, écrans blancs pendant le chargement, mise en page qui saute (CLS).
- Modales pour tout : on préfère les pages dédiées pour la création et l'édition de ressources.
- Navigation qui change de structure d'une page à l'autre ; sous-menus toujours dépliés.
- Couleurs de badges inventées : utilise **uniquement** le mapping du §7.2.

---

**Commence maintenant par l'ÉTAPE 0 (extraction du prototype en ANNEXE A), puis la PHASE 1 (§1) : audite le repo, rédige `docs/refonte-admin/PLAN.md`, puis arrête-toi pour validation.**


---

## ANNEXE B — GUIDE DE LECTURE DU PROTOTYPE

Le prototype est une SPA en un seul fichier (HTML + CSS + JS vanilla), routée par le hash (`#orders`, `#p-shipping`…). Repères utiles dans le code :

| Élément | Où le trouver dans le prototype |
|---|---|
| Tokens (couleurs, radius, ombres) | bloc `:root{…}` au début du `<style>` |
| Styles de chaque composant | classes `.nav`, `.ph`, `.btn`, `.badge`, `.card`, `.ix-bar`, `table.ix`, `.mstrip`, `.empty`, `.fc`, `.dock`, `.drawer`, `.modal`, `.cmdk`, `.toast`, `.snav`, `.lrow`, `.toggle`, `.field`, `.banner` |
| Responsive | blocs `@media (max-width:1040px)` et `@media (max-width:820px)` |
| Icônes (paths SVG) | objet `P` dans le script, fonction `I(name)` |
| Illustrations | objet `ILL` et fonctions `artConversion`, `artMomo`, `artDomain`, `artShip`, `artCatalog`, `artApps`, `artBoxes` |
| Graphiques | fonctions `spark()`, `lineChart()` ; donut, cohorte et globe dans `V.analytics` et `V.live` |
| Navigation | constantes `NAV`, `CHANNELS_NAV`, `APPS_NAV`, `SET` (paramètres), fonctions `renderNav`, `renderSnav` |
| Composants réutilisables | `header()` (PageHeader), `ixBar()` (IndexFilters), `table()` (IndexTable), `mstrip()` (MetricsStrip), `empty()` (EmptyState), `badge()`, `fc()` (FeedCard) |
| Écrans | objet `V` (une fonction par route), objet `S` (paramètres) |
| Modales et overlays | `openApps`, `openChannels`, `openFbModal`, `openCmdk`, `openAxia`, `moreMenu`, `toast` |
| Données de démo | `STORE`, `PRODUCTS`, `ORDERS`, `CUSTOMERS` (à transformer en mocks typés, §15) |

**Ce qu'il faut reprendre du prototype** : le visuel, les mesures, les textes, la structure des écrans, le comportement responsive.

**Ce qu'il ne faut PAS reprendre** : l'architecture du code. Il s'agit de concaténation de chaînes HTML, d'un état global et de données en dur ; il faut le réimplémenter proprement dans la stack du repo, avec des composants typés (§2, §7).

---

## ANNEXE A — PROTOTYPE HTML COMPLET (`reference/axso-admin-prototype.html`)

> À extraire tel quel à l'ÉTAPE 0. Fichier autonome (≈ 147 Ko, logo AXSO inclus en base64).

````html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AXSO Admin — Maison Ndolo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;550;600;650;700&display=swap" rel="stylesheet">
<style>
:root{
  --frame:#0c0c0c; --nav-text:#e3e3e3; --nav-muted:#a1a1a1; --nav-hover:#1f1f1f; --nav-active:#2b2b2b;
  --bg:#ffffff; --surface:#ffffff; --surface-2:#f7f7f7; --surface-3:#f1f1f1;
  --border:#e3e3e3; --border-2:#ebebeb; --text:#303030; --text-strong:#1a1a1a; --muted:#616161; --subdued:#8a8a8a;
  --primary:#1a1a1a; --link:#005bd3;
  --ok-bg:#cdfee1; --ok-tx:#0c5132; --att-bg:#ffeb78; --att-tx:#4f4700; --warn-bg:#ffd6a4; --warn-tx:#5e4200;
  --crit-bg:#fedad9; --crit-tx:#8e0b21; --info-bg:#e0f0ff; --info-tx:#00527c; --neutral-bg:#e3e3e3;
  --brand:#EBA900; --brand-ink:#0A1A33;
  --radius:12px; --r-sm:8px;
  --shadow-card:0 0 0 1px rgba(0,0,0,.07), 0 1px 0 rgba(0,0,0,.05);
  --chart:#2a6fdb; --chart-2:#9fc3f6; --chart-cyan:#1bb6e8;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:13px;line-height:20px;color:var(--text);background:var(--frame);-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01"}
button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
input,textarea,select{font:inherit;color:inherit}
a{color:inherit;text-decoration:none}
svg.i{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
svg.i.s{width:16px;height:16px}
.app{display:flex;height:100vh;padding:0 6px 6px 0}
/* ---------------- Sidebar ---------------- */
.nav{width:240px;flex:none;display:flex;flex-direction:column;color:var(--nav-text);padding:10px 8px 8px 12px;overflow:hidden}
.nav-top{display:flex;align-items:center;justify-content:space-between;height:36px;padding:0 4px 0 6px;margin-bottom:6px}
.logo{display:flex;align-items:center;gap:8px;font-weight:650;letter-spacing:.2px}
.logo img{width:26px;height:26px;border-radius:6px;background:#fff;padding:2px}
.logo span{font-size:14px}
.icon-btn{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:var(--nav-muted)}
.icon-btn:hover{background:var(--nav-hover);color:#fff}
.search{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px;border-radius:10px;background:#262626;color:#b5b5b5;margin:0 2px 10px;cursor:text;border:1px solid #333}
.search:hover{background:#2c2c2c}
.search kbd{margin-left:auto;font:inherit;font-size:12px;color:#8a8a8a}
.nav-scroll{flex:1;overflow:auto;margin-right:-4px;padding-right:4px;scrollbar-width:thin;scrollbar-color:#333 transparent}
.nav-item{display:flex;align-items:center;gap:10px;height:30px;padding:0 8px;border-radius:8px;color:var(--nav-text);font-weight:550;margin:1px 0;white-space:nowrap}
.nav-item:hover{background:var(--nav-hover)}
.nav-item.active{background:var(--nav-active);color:#fff}
.nav-item .i{color:#cfcfcf}
.nav-item .count{margin-left:auto;font-size:12px;font-weight:550;background:#333;color:#e3e3e3;border-radius:7px;padding:0 6px;line-height:20px}
.nav-item .dot{margin-left:auto;width:6px;height:6px;border-radius:50%;background:#8a8a8a}
.nav-sub{display:none}
.nav-sub.open{display:block}
.nav-sub a{display:flex;align-items:center;height:28px;padding-left:38px;border-radius:8px;color:var(--nav-muted);font-weight:500;margin:1px 0}
.nav-sub a:hover{background:var(--nav-hover);color:#e3e3e3}
.nav-sub a.active{background:var(--nav-active);color:#fff;font-weight:600}
.nav-label{display:flex;align-items:center;gap:4px;color:var(--nav-muted);font-size:12px;font-weight:550;padding:16px 8px 4px;cursor:pointer}
.nav-label:hover{color:#e3e3e3}
.nav-bottom{border-top:1px solid #1f1f1f;padding-top:6px;margin-top:6px}
.store-chip{display:flex;align-items:center;gap:10px;height:34px;padding:0 8px;border-radius:8px}
.store-chip:hover{background:var(--nav-hover)}
.store-av{width:20px;height:20px;border-radius:5px;background:var(--brand);color:var(--brand-ink);display:grid;place-items:center;font-size:11px;font-weight:700}
.bell{margin-left:auto;position:relative;color:#cfcfcf}
.bell b{position:absolute;top:-6px;right:-7px;background:#e51c00;color:#fff;font-size:10px;line-height:14px;border-radius:7px;padding:0 4px;font-weight:600}
/* ---------------- Main ---------------- */
.main{flex:1;min-width:0;background:var(--bg);border-radius:12px;margin-top:6px;overflow:auto;position:relative;scroll-behavior:smooth}
.main::-webkit-scrollbar{width:10px}.main::-webkit-scrollbar-thumb{background:#d4d4d4;border-radius:10px;border:3px solid #fff}
.page{max-width:1200px;margin:0 auto;padding:0 20px 120px}
.page.narrow{max-width:1000px}
.page.thin{max-width:720px}
.ph{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);display:flex;align-items:center;gap:8px;min-height:56px;padding:10px 20px;margin:0 -20px 4px}
.ph h1{font-size:14px;font-weight:650;margin:0;color:var(--text-strong);display:flex;align-items:center;gap:8px}
.ph h1 .i{color:#4a4a4a}
.ph .sp{flex:1}
.ph .tag{font-weight:500;color:var(--muted);font-size:13px}
.btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:8px;background:#fff;font-weight:550;color:var(--text-strong);box-shadow:0 0 0 1px #dcdcdc inset,0 -1px 0 #d4d4d4 inset;white-space:nowrap}
.btn:hover{background:#f7f7f7}
.btn:active{background:#f0f0f0;box-shadow:0 0 0 1px #ccc inset}
.btn.primary{background:var(--primary);color:#fff;box-shadow:0 -1px 0 1px rgba(0,0,0,.8) inset,0 0 0 1px #303030 inset,0 .5px 0 1.5px rgba(255,255,255,.25) inset}
.btn.primary:hover{background:#2b2b2b}
.btn.plain{box-shadow:none;background:none;color:var(--link);padding:0 6px}
.btn.plain:hover{text-decoration:underline;background:none}
.btn.ghost{box-shadow:none;background:none}
.btn.ghost:hover{background:var(--surface-3)}
.btn.sm{height:26px;padding:0 10px;font-size:12px}
.btn.tint{background:#f1f1f1;box-shadow:none}
.btn.tint:hover{background:#e7e7e7}
.btn.disabled{opacity:.45;pointer-events:none}
.card{background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow-card);overflow:hidden}
.card.pad{padding:16px}
.card + .card{margin-top:16px}
.grid>.card+.card,.grid>*>.card+.card{margin-top:0}
.ix-wrap{overflow-x:auto}
.kbar>div{white-space:nowrap}
.search{white-space:nowrap;overflow:hidden}
.card h2,.h2,h2{font-size:13px;font-weight:650;margin:0;color:var(--text-strong)}
.muted{color:var(--muted)}
.subdued{color:var(--subdued)}
.small{font-size:12px;line-height:16px}
.strong{font-weight:600;color:var(--text-strong)}
.link{color:var(--link);cursor:pointer}.link:hover{text-decoration:underline}
.u{text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.dotted{border-bottom:1px dashed #b5b5b5;cursor:help}
.row{display:flex;align-items:center;gap:8px}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
.stack>*+*{margin-top:16px}
.divider{height:1px;background:var(--border-2);margin:12px -16px}
/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border-radius:8px;font-size:12px;font-weight:550;background:var(--neutral-bg);color:#303030;white-space:nowrap}
.badge.ok{background:var(--ok-bg);color:var(--ok-tx)}
.badge.att{background:var(--att-bg);color:var(--att-tx)}
.badge.warn{background:var(--warn-bg);color:var(--warn-tx)}
.badge.crit{background:var(--crit-bg);color:var(--crit-tx)}
.badge.info{background:var(--info-bg);color:var(--info-tx)}
.badge .pip{width:8px;height:8px;border-radius:50%;border:1.5px solid currentColor}
.badge .pip.half{background:linear-gradient(90deg,currentColor 50%,transparent 50%)}
.badge .pip.full{background:currentColor}
/* Index table */
.ix-bar{display:flex;align-items:center;gap:8px;height:44px;padding:0 8px 0 12px;border-bottom:1px solid var(--border-2)}
.ix-tab{height:28px;padding:0 10px;border-radius:8px;font-weight:550;display:inline-flex;align-items:center;gap:4px;color:var(--muted)}
.ix-tab.on{background:var(--surface-3);color:var(--text-strong)}
.ix-tab:hover{background:var(--surface-2)}
.ix-search{flex:1;display:flex;align-items:center;gap:6px;color:var(--subdued);height:28px;padding:0 6px;border-radius:8px}
.ix-search input{border:0;outline:0;flex:1;background:transparent;color:var(--text)}
.ix-search input::placeholder{color:var(--subdued)}
table.ix{width:100%;border-collapse:collapse}
.ix th{text-align:left;font-weight:550;color:var(--muted);font-size:12px;height:36px;padding:0 12px;background:var(--surface-2);border-bottom:1px solid var(--border-2);white-space:nowrap}
.ix td{height:40px;padding:6px 12px;border-bottom:1px solid var(--border-2);white-space:nowrap;vertical-align:middle}
.ix tr:last-child td{border-bottom:0}
.ix tbody tr{cursor:pointer}
.ix tbody tr:hover td{background:var(--surface-2)}
.ix .num{text-align:right;font-variant-numeric:tabular-nums}
.ix .cb{width:36px;padding-right:0}
.ix td.wrap{white-space:normal}
.cbx{width:16px;height:16px;border-radius:5px;border:1.5px solid #b5b5b5;display:inline-block;vertical-align:middle;background:#fff}
.ix tr.sel td{background:#f3f3f3}
.ix tr.sel .cbx,.cbx.on{background:#1a1a1a;border-color:#1a1a1a;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}
.thumb{width:40px;height:40px;border-radius:8px;border:1px solid var(--border);display:grid;place-items:center;flex:none;overflow:hidden;background:#fafafa}
.pager{display:flex;align-items:center;gap:4px;padding:8px 12px;background:var(--surface-2);border-top:1px solid var(--border-2);color:var(--muted);font-size:12px}
.pager button{width:28px;height:28px;border-radius:8px;display:grid;place-items:center}
.pager button:hover{background:#e9e9e9}
/* metrics strip */
.mstrip{display:flex;align-items:stretch;border-radius:var(--radius);box-shadow:var(--shadow-card);background:#fff;margin-bottom:16px;overflow:hidden}
.mstrip .per{display:flex;align-items:center;gap:6px;padding:0 16px;color:var(--text-strong);font-weight:550;border-right:1px solid var(--border-2);white-space:nowrap}
.mstrip .m{flex:1;padding:12px 16px;min-width:0;border-right:1px solid var(--border-2)}
.mstrip .m:last-child{border-right:0}
.mstrip .m .t{font-weight:550;color:var(--text-strong);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mstrip .m .v{white-space:nowrap;display:flex;align-items:center;gap:8px;margin-top:2px}
.delta{white-space:nowrap;font-size:12px;color:var(--ok-tx);display:inline-flex;align-items:center;gap:1px;font-weight:550}
.delta.down{color:var(--muted)}
/* Empty state */
.empty{text-align:center;padding:48px 24px 56px}
.empty .ill{width:200px;height:150px;margin:0 auto 20px}
.empty h3{font-size:14px;font-weight:650;margin:0 0 6px;color:var(--text-strong)}
.empty p{max-width:460px;margin:0 auto 16px;color:var(--muted)}
.foot-link{text-align:center;color:var(--muted);margin:20px 0}
/* Home */
.kbar{display:flex;align-items:center;gap:36px;padding:14px 4px 0;color:var(--muted)}
.kbar .k{text-align:center}
.kbar .k .l{color:var(--muted)}
.kbar .k .v{color:var(--text-strong);font-weight:600;display:flex;gap:6px;align-items:center;justify-content:center}
.live-dot{display:inline-block;width:9px;height:9px;border-radius:50%;border:2px solid #29845a;margin-left:6px}
.hero{text-align:center;margin:56px 0 28px}
.hero h1{font-size:28px;line-height:36px;font-weight:550;letter-spacing:-.4px;margin:0;color:var(--text-strong)}
.ask{max-width:640px;margin:0 auto;border-radius:16px;box-shadow:0 0 0 1px #e3e3e3,0 4px 14px rgba(0,0,0,.06);padding:14px 14px 10px;background:#fff}
.ask textarea{width:100%;border:0;outline:0;resize:none;height:42px;font-size:14px;color:var(--text-strong)}
.ask textarea::placeholder{color:var(--subdued)}
.ask .bar{display:flex;align-items:center;gap:6px}
.chips{display:flex;justify-content:center;gap:8px;margin:16px 0 56px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 6px 0 12px;border-radius:12px;box-shadow:0 0 0 1px #e3e3e3;background:#fff;font-weight:500;color:var(--text-strong)}
.chip:hover{background:#f7f7f7}
.chip b{font-weight:550;font-size:12px;background:#f1f1f1;border-radius:8px;padding:0 6px;line-height:22px;color:var(--muted)}
.feed{max-width:940px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.fc{border-radius:14px;box-shadow:var(--shadow-card);background:#fff;padding:8px;display:flex;flex-direction:column;position:relative}
.fc .art{height:140px;border-radius:10px;overflow:hidden;position:relative;background:#f3f3f3}
.fc .bd{padding:12px 8px 6px;flex:1;display:flex;flex-direction:column}
.fc h4{margin:0 0 4px;font-size:13px;font-weight:650;color:var(--text-strong)}
.fc p{margin:0;color:var(--muted);font-size:12px;line-height:17px}
.fc .go{margin-top:auto;padding-top:14px}
.fc .x{position:absolute;top:14px;right:14px;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;color:var(--muted);opacity:0;background:#fff}
.fc:hover .x{opacity:1}
.pill-dark{position:absolute;top:10px;left:10px;display:inline-flex;align-items:center;gap:6px;background:rgba(48,48,48,.85);color:#fff;font-size:12px;font-weight:550;border-radius:8px;padding:2px 8px}
.pill-dark i{width:10px;height:10px;border-radius:50%;border:1.5px solid #bbb}
/* AXIA dock */
.dock{position:fixed;bottom:18px;left:calc(50% + 120px);transform:translateX(-50%);display:flex;align-items:center;gap:6px;height:44px;padding:0 8px 0 10px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px #e3e3e3,0 8px 24px rgba(0,0,0,.12);z-index:30;width:360px;cursor:text}
.dock .ph-t{color:var(--subdued);flex:1}
.axia-av{width:22px;height:22px;border-radius:7px;background:var(--brand-ink);display:grid;place-items:center;flex:none}
.axia-av svg{width:14px;height:14px}
.sep{width:1px;height:18px;background:#e3e3e3;margin:0 2px}
.mini{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:#4a4a4a}
.mini:hover{background:#f1f1f1}
/* Drawer (AXIA) */
.drawer{position:fixed;top:12px;right:12px;bottom:12px;width:400px;background:#fff;border-radius:14px;box-shadow:0 0 0 1px #e3e3e3,0 20px 50px rgba(0,0,0,.25);z-index:60;display:flex;flex-direction:column;transform:translateX(440px);transition:transform .22s ease}
.drawer.open{transform:none}
.drawer .dh{display:flex;align-items:center;gap:8px;padding:12px 12px 12px 16px;border-bottom:1px solid var(--border-2);font-weight:650}
.drawer .msgs{flex:1;overflow:auto;padding:16px}
.msg{margin-bottom:14px;max-width:90%}
.msg.me{margin-left:auto;background:#f1f1f1;border-radius:12px;padding:8px 12px}
.msg.ai{color:var(--text-strong)}
.msg.ai ul{margin:6px 0;padding-left:18px}
.drawer .in{border-top:1px solid var(--border-2);padding:10px}
.drawer .in textarea{width:100%;border:1px solid #d4d4d4;border-radius:10px;padding:8px 10px;resize:none;height:60px;outline:0}
.drawer .in textarea:focus{border-color:#1a1a1a}
/* Modal */
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;display:none;align-items:flex-start;justify-content:center;padding-top:9vh}
.scrim.open{display:flex}
.modal{background:#fff;border-radius:14px;width:620px;max-width:94vw;max-height:80vh;overflow:auto;box-shadow:0 26px 80px rgba(0,0,0,.35)}
.modal .mh{display:flex;align-items:center;padding:12px 12px 12px 16px;border-bottom:1px solid var(--border-2);font-weight:650;position:sticky;top:0;background:#fff;z-index:1}
.modal .mb{padding:16px}
.modal .mf{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--border-2)}
.cmdk{width:600px}
.cmdk .si{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border-2)}
.cmdk .si input{flex:1;border:0;outline:0;font-size:14px}
.cmdk .res{padding:6px}
.cmdk .res a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px}
.cmdk .res a:hover,.cmdk .res a.hl{background:#f1f1f1}
.cmdk .grp{font-size:12px;color:var(--muted);font-weight:550;padding:8px 10px 4px}
.toast{position:fixed;bottom:76px;left:calc(50% + 120px);transform:translateX(-50%) translateY(20px);background:#1a1a1a;color:#fff;padding:9px 14px;border-radius:10px;font-weight:550;opacity:0;transition:.2s;z-index:90;pointer-events:none}
.toast.on{opacity:1;transform:translateX(-50%)}
/* Settings layout */
.app.settings .nav{display:none}
.snav{display:none;width:270px;flex:none;color:var(--nav-text);padding:10px 8px 8px 8px}
.app.settings .snav{display:flex;flex-direction:column}
.snav .rail{display:flex;gap:6px;height:100%}
.snav .back{display:flex;align-items:center;gap:6px;height:36px;font-weight:600;color:#fff;padding:0 6px;border-radius:8px}
.snav .back:hover{background:var(--nav-hover)}
.snav .search{margin:6px 0 10px}
.snav .sitem{display:flex;align-items:center;gap:10px;height:30px;padding:0 8px;border-radius:8px;color:var(--nav-text);font-weight:500}
.snav .sitem:hover{background:var(--nav-hover)}
.snav .sitem.active{background:var(--nav-active);color:#fff;font-weight:600}
.snav .sitem .i{color:#bdbdbd;width:18px;height:18px}
.snav .storecard{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:#1c1c1c;margin-bottom:6px}
.snav .user{display:flex;align-items:center;gap:10px;padding:8px;border-top:1px solid #1f1f1f;margin-top:6px}
.av{width:28px;height:28px;border-radius:50%;background:#2c6ecb;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:650;flex:none}
.set-h{font-size:20px;font-weight:650;letter-spacing:-.2px;margin:36px 0 18px;color:var(--text-strong);display:flex;align-items:center;gap:10px}
.set-sec{margin:24px 0 8px}
.set-sec h3{margin:0;font-size:13px;font-weight:650;color:var(--text-strong)}
.set-sec p{margin:2px 0 0;color:var(--muted)}
.lrow{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--border-2)}
.lrow:first-child{border-top:0}
.lrow:hover{background:var(--surface-2);cursor:pointer}
.lrow .chev{margin-left:auto;color:var(--subdued)}
.banner{display:flex;gap:10px;align-items:flex-start;background:#eaf4ff;border-radius:10px;padding:10px 12px;color:#00527c}
.banner.warn{background:#fff5ea;color:#5e4200}
.toggle{width:32px;height:18px;border-radius:9px;background:#b5b5b5;position:relative;flex:none;cursor:pointer;transition:.15s}
.toggle::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:.15s}
.toggle.on{background:#1a1a1a}.toggle.on::after{left:16px}
.field{display:block;margin-bottom:12px}
.field span{display:block;margin-bottom:4px;color:var(--text-strong)}
.field input,.field textarea,.field select{width:100%;height:32px;border:1px solid #8a8a8a;border-radius:8px;padding:0 10px;background:#fdfdfd;outline:0}
.field textarea{height:72px;padding:6px 10px;resize:vertical}
.field input:focus,.field textarea:focus{border-color:#1a1a1a;box-shadow:0 0 0 1px #1a1a1a}
/* Charts */
.chart{width:100%;display:block}
.legend{display:flex;gap:16px;justify-content:center;color:var(--muted);font-size:12px;margin-top:6px}
.legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.kpi .t{font-weight:600;color:var(--text-strong)}
.kpi .v{font-size:20px;font-weight:650;letter-spacing:-.3px;color:var(--text-strong);margin-top:4px;display:flex;align-items:baseline;gap:8px}
.hbar{height:18px;background:var(--chart-cyan);border-radius:3px}
.cohort td{font-size:12px;height:30px;padding:0 8px;text-align:center}
.timeline .ev{display:flex;gap:10px;padding:6px 0;align-items:flex-start}
.timeline .ev i{width:9px;height:9px;border-radius:50%;background:#8a8a8a;margin-top:6px;flex:none}
.timeline .ev i.g{background:#29845a;box-shadow:0 0 0 3px #cdfee1}
.skel{background:linear-gradient(90deg,#f1f1f1,#f7f7f7,#f1f1f1);background-size:200% 100%;animation:sk 1.2s infinite;border-radius:6px}
@keyframes sk{to{background-position:-200% 0}}
.theme-prev{border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px #e3e3e3}
.mobile-top{display:none}
@media (max-width:1100px){.feed{grid-template-columns:repeat(2,1fr)}.g4{grid-template-columns:repeat(2,1fr)}}
.ph-more{display:none}
.navscrim{display:none}
@media (max-width:1040px){.page{padding:0 16px 110px}.ph{margin:0 -16px 4px;padding:10px 16px}.mstrip{overflow-x:auto}.mstrip .m{min-width:170px}}
@media (max-width:820px){
  body{background:#fff}
  .app{padding:0;display:block;height:auto;min-height:100vh}
  .nav,.app.settings .snav{position:fixed;top:0;bottom:0;left:0;width:290px;z-index:75;background:var(--frame);transform:translateX(-105%);transition:transform .22s ease;display:flex}
  .app.navopen .nav,.app.settings.navopen .snav{transform:none}
  .app.navopen .navscrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:74}
  .main{border-radius:0;margin:0;overflow:visible;min-height:100vh}
  .mobile-top{display:flex;align-items:center;gap:6px;height:52px;padding:0 8px;background:var(--frame);color:#fff;position:sticky;top:0;z-index:40}
  .mobile-top .mb{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#e3e3e3}
  .mobile-top .mb:active{background:#262626}
  .mobile-top .msearch{flex:1;height:34px;border-radius:10px;background:#262626;border:1px solid #333;color:#a1a1a1;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:14px}
  .ph{top:52px;min-height:52px;flex-wrap:nowrap}
  .ph h1{font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ph .tag,.ph>.btn.ghost{display:none}
  .ph .btn:not(.primary),.ph .mini:not(.ph-more),.ph .btn.plain{display:none}
  .ph .ph-more{display:grid}
  .page,.page.narrow,.page.thin{padding:0 12px 100px}
  .ph{margin:0 -12px 4px;padding:8px 12px}
  .card{border-radius:12px}
  .feed,.g2,.g3,.g4{grid-template-columns:1fr}
  .grid[style*="grid-template-columns"]{grid-template-columns:1fr!important}
  .kbar{gap:20px;overflow-x:auto;padding:14px 0 4px;scrollbar-width:none}
  .kbar>div:first-child,.kbar>div:last-child{flex:none}
  .kbar .hide-m{display:block!important}
  .hero{margin:28px 0 20px}.hero h1{font-size:22px;line-height:29px}
  .chips{justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;margin:14px -12px 28px;padding:0 12px;scrollbar-width:none}
  .chip{flex:none}
  .mstrip{overflow-x:auto;scrollbar-width:none}.mstrip .m{min-width:160px}
  .ix-bar{overflow-x:auto;scrollbar-width:none}.ix-tab{flex:none}.ix-search{min-width:150px}
  /* Index tables -> condensed resource list (mobile pattern) */
  table.ix,table.ix tbody{display:block}
  .ix thead{display:none}
  .ix tbody tr{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:12px 14px;border-bottom:1px solid var(--border-2)}
  .ix tbody tr:last-child{border-bottom:0}
  .ix td{display:block;height:auto;padding:0;border:0!important;white-space:normal;color:var(--muted);font-size:13px}
  .ix td.cb{display:none}
  .ix td:empty{display:none}
  .ix tbody tr td:nth-child(2){flex-basis:100%;color:var(--text-strong)}
  .ix tbody tr td:nth-child(2):has(.thumb){flex-basis:auto}
  .ix tbody tr td:nth-child(2):has(.thumb)+td{flex:1;min-width:60%;color:var(--text-strong)}
  .ix td.num{text-align:left}
  .ix tbody tr:hover td{background:none}
  .ix-wrap{overflow:visible}
  .dock{left:12px;right:12px;width:auto;transform:none;bottom:12px}
  .toast{left:50%;bottom:72px}
  .drawer{top:0;right:0;bottom:0;width:100%;border-radius:0}
  .scrim{padding-top:0;align-items:flex-end}
  .modal{width:100%!important;max-width:100%;border-radius:16px 16px 0 0;max-height:88vh}
  .set-h{font-size:18px;margin:20px 0 14px;flex-wrap:wrap}
  .hide-m{display:none!important}
  .lrow{padding:12px 14px}
  .empty{padding:32px 16px 40px}
}
</style>
</head>
<body>
<div class="app" id="app">
  <aside class="nav" id="nav"></aside>
  <aside class="snav" id="snav"></aside>
  <div class="navscrim" onclick="document.getElementById('app').classList.remove('navopen')"></div>
  <main class="main" id="main"></main>
</div>
<div class="dock" id="dock" onclick="openAxia()">
  <span class="axia-av" id="dockav"></span><span class="ph-t">Travailler avec AXIA</span>
  <button class="mini" title="Ajouter"></button><button class="mini" title="Dicter"></button><button class="mini" title="Vocal"></button><span class="sep"></span><button class="mini" title="Ouvrir le panneau"></button>
</div>
<div class="drawer" id="drawer"></div>
<div class="scrim" id="scrim" onclick="if(event.target===this)closeModal()"><div class="modal" id="modal"></div></div>
<div class="toast" id="toast"></div>

<script>
/* ===================== Icons ===================== */
const P={
home:'M3.5 9 10 3.8 16.5 9v7a1 1 0 0 1-1 1H12v-4.5H8V17H4.5a1 1 0 0 1-1-1z',
orders:'M3 11h4l1 2h4l1-2h4M4.5 4h11l1.5 7v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z',
tag:'M10.6 3H16a1 1 0 0 1 1 1v5.4l-7.6 7.6a1 1 0 0 1-1.4 0L3 12a1 1 0 0 1 0-1.4zM13.5 6.5h.01',
user:'M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.8 17c.6-3 3-4.6 6.2-4.6s5.6 1.6 6.2 4.6',
gauge:'M3.2 14.5a7 7 0 1 1 13.6 0M10 13.5l3.2-3.6M10 13.5h.01',
disc:'M10 2.6l1.8 1.3 2.2-.2.8 2.1 2.1.8-.2 2.2 1.3 1.8-1.3 1.8.2 2.2-2.1.8-.8 2.1-2.2-.2L10 17.4l-1.8-1.3-2.2.2-.8-2.1-2.1-.8.2-2.2L2 10l1.3-1.8-.2-2.2 2.1-.8.8-2.1 2.2.2zM7.6 12.4l4.8-4.8M7.8 8h.01M12.2 12h.01',
img:'M3.5 4.5h13v11h-13zM3.5 12.5l3.8-3.8 3.7 3.8 2-2 3.5 3.5M12.8 7.6h.01',
globe:'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM3 10h14M10 3c1.9 2 2.8 4.4 2.8 7s-.9 5-2.8 7c-1.9-2-2.8-4.4-2.8-7S8.1 5 10 3z',
bars:'M4.5 16v-5M8.2 16V5.5M11.8 16V8.5M15.5 16V4',
store:'M3.2 7.6 4.6 4h10.8l1.4 3.6v.6a2.1 2.1 0 0 1-3.8 1.2 2.2 2.2 0 0 1-3 .6 2.2 2.2 0 0 1-3-.6A2.1 2.1 0 0 1 3.2 8.2zM4.4 10.4V16h11.2v-5.6M8.4 16v-3.4h3.2V16',
spark:'M10 3.2l1.5 4.2 4.3 1.6-4.3 1.6L10 14.8l-1.5-4.2L4.2 9l4.3-1.6zM15.5 13.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z',
meta:'M6 6.5c-2 0-3 2-3 3.8C3 12 3.9 13.5 5.4 13.5c2.6 0 4.6-7 7.4-7 1.9 0 3.2 2 3.2 4 0 1.7-.9 3-2.4 3-2.8 0-4.4-7-7.6-7z',
wa:'M10 3a7 7 0 0 0-6.1 10.4L3 17l3.7-.9A7 7 0 1 0 10 3zM7.6 7.4c.2-.4.5-.4.7-.4h.4c.2 0 .3 0 .4.3l.6 1.4c0 .2 0 .3-.1.4l-.4.5c-.1.1-.1.3 0 .4.6 1 1.4 1.7 2.4 2.2.2.1.3.1.4 0l.5-.6c.1-.1.3-.2.4-.1l1.4.6c.2.1.3.2.3.4 0 .7-.6 1.4-1.3 1.5-2.6.3-5.6-2.6-5.7-5.1 0-.5.2-1.1.4-1.5z',
gear:'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.6 2.8h2.8l.4 2 1.4.8 1.9-.7 1.4 2.4-1.5 1.4v1.6l1.5 1.4-1.4 2.4-1.9-.7-1.4.8-.4 2H8.6l-.4-2-1.4-.8-1.9.7-1.4-2.4 1.5-1.4V9.2L3.5 7.8l1.4-2.4 1.9.7 1.4-.8z',
search:'M8.8 15a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4zM13.2 13.2 17 17',
plus:'M10 4.5v11M4.5 10h11',
chevR:'M8 5l5 5-5 5', chevD:'M5 8l5 5 5-5', chevL:'M12 5l-5 5 5 5', chevUD:'M7 8l3-3 3 3M7 12l3 3 3-3',
x:'M5.5 5.5l9 9M14.5 5.5l-9 9',
mic:'M10 12.5a2.5 2.5 0 0 0 2.5-2.5V5.5a2.5 2.5 0 0 0-5 0V10a2.5 2.5 0 0 0 2.5 2.5zM5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v2.5',
wave:'M4 8.5v3M7 6v8M10 4v12M13 6.5v7M16 8.5v3',
hist:'M3.8 10a6.2 6.2 0 1 0 1.8-4.4M3.5 3.8v2.6h2.6M10 6.8V10l2.2 1.4',
cols:'M3.5 4.5h13v11h-13zM8 4.5v11M12 4.5v11',
sort:'M6.5 4v12M4 6.5 6.5 4 9 6.5M13.5 16V4M11 13.5l2.5 2.5 2.5-2.5',
cal:'M4 5.5h12v10.5H4zM4 9h12M7.5 3.5v3M12.5 3.5v3',
eye:'M2.8 10s2.6-5 7.2-5 7.2 5 7.2 5-2.6 5-7.2 5-7.2-5-7.2-5zM10 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
bell:'M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.2 1.5H4.3zM8.5 16.8h3',
exp:'M10 12.5V3.5M6.8 6.5 10 3.4l3.2 3.1M4 11.5V16h12v-4.5',
imp:'M10 3.5v9M6.8 9.5 10 12.6l3.2-3.1M4 11.5V16h12v-4.5',
grid:'M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z',
info:'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 9v4.5M10 6.6h.01',
check:'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7 10.2l2 2 4-4.2',
lock:'M5.5 9h9v7.5h-9zM7.5 9V6.5a2.5 2.5 0 0 1 5 0V9',
dots:'M5 10h.01M10 10h.01M15 10h.01',
panel:'M3.5 4.5h13v11h-13zM8 4.5v11',
box:'M10 2.8 16.5 6v8L10 17.2 3.5 14V6zM3.5 6 10 9.3 16.5 6M10 9.3v7.9',
truck:'M2.8 5.5h9v8h-9zM11.8 8.5h3l2.4 2.6v2.4h-5.4M6 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM14.4 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
card:'M3 5.5h14v9H3zM3 8.5h14M6 12h3',
money:'M3 6h14v8H3zM10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 8.5v3M14.5 8.5v3',
pin:'M10 17s5.5-4.6 5.5-9a5.5 5.5 0 0 0-11 0c0 4.4 5.5 9 5.5 9zM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
receipt:'M5 3h10v14l-2-1.3-1.7 1.3L10 15.7 8.7 17 7 15.7 5 17zM7.5 7h5M7.5 10h5',
users:'M7.5 9.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.5 16c.4-2.6 2.4-4 5-4s4.6 1.4 5 4M13 4.2a2.8 2.8 0 0 1 0 5.4M14.5 12.3c1.6.4 2.7 1.7 3 3.7',
mail:'M3 5h14v10H3zM3.5 5.5 10 10.5l6.5-5',
lang:'M3 5h8M7 3.5V5M4.8 5c.6 2.8 2.6 5 5 6M9.4 5c-.7 3-2.8 5.4-5.4 6.4M10.5 17l3-7.5 3 7.5M11.5 14.5h4',
shield:'M10 2.8 16 5v4.5c0 3.8-2.6 6.4-6 7.7-3.4-1.3-6-3.9-6-7.7V5z',
doc:'M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5',
link:'M8.5 11.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.8.8M11.5 8.5a3 3 0 0 0-4.2 0L5 10.8a3 3 0 0 0 4.2 4.2l.8-.8',
bolt:'M11 2.8 4.5 11H10l-1 6.2L15.5 9H10z',
db:'M10 7c3.6 0 6.5-1 6.5-2.3S13.6 2.5 10 2.5 3.5 3.4 3.5 4.7 6.4 7 10 7zM3.5 4.7v10.6C3.5 16.6 6.4 17.5 10 17.5s6.5-.9 6.5-2.2V4.7M3.5 10c0 1.3 2.9 2.3 6.5 2.3s6.5-1 6.5-2.3',
folder:'M3 5h5l1.5 1.8H17v9H3z',
menu:'M4 6h12M4 10h12M4 14h12',
pen:'M12.8 4.2l3 3L7.5 15.5l-3.7.7.7-3.7z',
ext:'M11 4h5v5M16 4l-7 7M14 12v4H4V6h4',
arrowR:'M4.5 10h11M11 5.5l4.5 4.5-4.5 4.5',
up:'M10 15.5v-11M5.5 9 10 4.5 14.5 9',
fullscreen:'M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4',
star:'M10 3l2.1 4.4 4.8.6-3.5 3.3.9 4.8L10 13.8l-4.3 2.3.9-4.8L3.1 8l4.8-.6z',
flag:'M5 17V3.5M5 4h9l-1.8 3L14 10H5'
};
function I(n,c=''){return `<svg class="i ${c}" viewBox="0 0 20 20"><path d="${P[n]||''}"/></svg>`}
const AXIA_SVG=`<svg viewBox="0 0 16 16"><path d="M8 2.2l1.3 3.6 3.6 1.4-3.6 1.3L8 12.2 6.7 8.5 3.1 7.2l3.6-1.4z" fill="#EBA900"/></svg>`;
const LOGO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABeCAIAAABTioayAAAVG0lEQVR42u1cd3Rc1Zn/vnvve/OmaKQZdVnFKu5FBku2gdgGZGxDIIkJhATImmqWzRLYQNohZ0kPgQ0bUlhIhyW7BLKQTVjAGGxswJItW7blbnCRZFmSrTZ95r1b9o+RbMuSrFEZSwm5R+fonDnzpHt/7/t+X7+olIK/r8EX+TsEfwdoVItNqN0ca2retmPv7n0fHG85GY2ZdsPIz8sunz2lct6s/LycjzRAb254/+nf/c+m6u0dHT6QAhABERSAkkBpVobnysUL7r39xiWXVlzgjeG4k/TRhuNf/daPX/6/DcLi1KZRMoDWC6GEaeqG9rnrV37/4fvycrM/KgCtf3frHfc90tDQrNltiHj689O7OudDKxKdNq34dz//7qL5c//2AVr3TvVNd36lyx/S9bimo5SSmyYA6jZNY9S0hBUzgQDTbHHBQoBYzMrOTHv52ScuXXDR3zJA+w8dqVq1pvVkh67rChQAmNFYmtu9suqSFcsumzGl2OkwAqHI3gNHXlu36a0NWwLhiG7TejEyiwvz3v7TL4sLJyV9o2o8VsyMLb/hHvDM0fMq9bxKLbcCvOWfuPm+XXsODvj9Ldvrl626GzxztbzK+COQNmfV6gc458ne6vgA9PxLr4K357RaXgV45z7w8GOmZZ3nkXAketcDj4Bn7mlMSUb5/76+PtlbHQcVM01r6SfuqNm+W9f1uGZ99voVzz/z6ID265wHP33bl15d+65u6ABgxsyqJZVvvPQ0o3RQ/QCQPCxCR3jXDunbDSKKrlI9u0pLnT1xOai6dtfST9wJiIgohMjJ8Nas/c/8SQn5gR8cbrh05equYJAQIjgnSHZu/MOsaaXnugWWT/gPiq46q32z6KqTocNgRTFOdQCop2gldzvnfpOwlInoKL797hYrGtMddgAQpnXrZz6eIDoAMKW06DOrrnrqZ89JlzPDm3ZJ5bzsrNweUGKnuG+f6KjhHTWiu16Gm4BbCAAEEAFojxEEABABa/8TgeCBlEtfGBKjcQBo+679QEjcPuiG7ZNXXzGsx7/x0BemT5s+pWzy7KmTcj1cdm8M7d7MO7YI314VbQGhAAERkAx+OATQgB9/LbzvUefc7+EoAVK9wCslROiIDB0HVMRRRF2lOHx0hBDNLSfjAEkpszO9ZSWFiRpcACXNHFfnfZ/U+ckXowc3+7v3y2gHSEAEOD8o/VGiYB75tTHln5k9d1QASSvAu+tF2zqzdZ301SsrCAjI3DT9UmPm121ZS4YFEBc8EonF/WOpVIrT6XQYQ2yAB3jwsOjcwds3865tKnhYmQGMC0IclJGlJBAg2ia6dwwboDiTiUgL76jhLW9apzbKwEGQskef47vhftHyRujkRjn/J/bSu86Ss6HSKwQpoyrufwkZCkUsLs6RVgUgzU7uPyg6t4n2zby7ToaPgWUC9EoKHSsfEGSkeRgcpECJwEGzbaPV8rro3KrCLfEXhaSH5PrATwFkJLz9fnRPMTKXJrgnjWlZ6WkQDKtUV2521qeuW+Z0uXq0L9pq+faIji28vUZ271aR40qKng1gvw2MTRgB0uxKyMwrAOvkpsjuR0TXNmUGe0BJRCYEkJyq1MvXYsKvdcfuD96t2TWvfMaMkqxMZzTWtcNqrxYdW4Rvn4q1gQBEgAT/+ygliINt9lddcx8dWoKk5QvVrpG+g0gBh2XZKIi2DdGjz9lLbk/k61JELyrDi3Ko2fbrWH11Z/cBFes+ozt4oe2qMjsTUzGzU0WbkY7kvSHKyI5/AS3FXnDDoCwbOCg6t/P2at5Vp4JHlBVC1SMmSGG8FiLEX8/QAKGRg85S1bWrj6orUBJQ9UjKoNghAPeFq2/hLWv1kts193SkhuRB7j8oOmt5e7Xo3inDx8DicTEZX1DOlSCrK9FQI3Lsv0LVnycg4/QOBIg9m3gXUVepiBwX7ZshdHxwakBQCiQoyog9F6gTLJ+MtoJQPaCMU3EAFajz6IQE4q1IvaoaB6cV1mvwpK3oc4BgNr6EINBVpmUuZukLqT2vx+5GWyOHfxnb9yiK8ECnVXG7hsBVuCluri88ofTZkASIoyN7WX9gnvZLGaOUDSlBqhfxs2KWfv5RrOmlcPVqUJELYGJGtyjNXqZPvpUYeSL4oXn0WXlqM1DsPeZZr9WR515RT/X0IeticU3o/TUI1RgFN+rTH1RiYoMjAT3zjHk/1LKv0NIXOErXpFRt1CbfCkINJEFhxUNjme7g0bbAmwtUuHFC1xyRKdSRufUZX5Xd9caUe4mz2P9GOURP9Hn/ChQ13Mu3a+6ZY1ZZZUa2XrYG5ISWIVQczLA++VbmnmJ+8NvA+qWR/T9ALaW/UqA0leUf49KzUXInuvJhAjc9SAEk/WL77G+K9i1IAUXE3P+EChzsTx9KSmX5xhggauRopWsmLhNJQJvXseBpZHar9c0z8e0gpkdZ3WPfvGAvvQtd+RNR0RQoYjgqn9E9laJzu+zaMeQRpZkEgKiRayu5W8lh7BsEgIDkKqYEBZp9/k+NghsQIHrkt8DNoR86b0A/clNkK70LnXkJHVgA2rJo3gpWeD06i5KFkQRFHI7Kpx2ldwGA5d9vNb4wZJIEFWCsIykAUXueXnr3kEykBNDJt6Ysr3UvfcNe/jimzEgGQEqAsk9yfuwP9pI74h9E9n5bxbqGdmgxaRKEAPbSNejMPd+BJdCcqpSFvyH2/NAHT/lfL5cn3hhjB0oBcKDZVe4r1hl518ZLO5GGF6yGFxMMiaXVmawOM2rP00vOJ0QKwJjyTwAY2HwLoZox7X7QXGqsmEiBEqD0TP3ix91LX9XcM+Kejemrj+x4EBO3IMkg6TM+UdndcB4hIoS4p4YPPM6PvGAdesqY8ZWUqk2s8AZAm+KjgEkCcACWqk+5x73sPef0hwjtyfzzyPFQ9WoVaUn0ZAhg+ZXiSaysBnf/a2zPdwaWZwVs8mp+4lUwO0AAK1yVctmLgMzqqIke/hU/8RcVPploPkTFswqgCBBXCcu/wSi5LS418fQMAvJIU/C9m2R79TAS2BLQPTV1RR2hzmQBJCLHfWsrIdY6ECMiCHUmiySATb45pfIZZC4FIMPHzba3rJbXRWetjDQB5/GsieobLsUFHZkTXSUs41It9xo9czHqHjxXUepDNatV187hpfcVEHuee2U9GSSgH5vafLD+YXPP9xPJ/igONG+5s/IZ5pyMZ2jSx4MfCv9+GTyqIi3S6gJpAiBSJ9jSqaOAuEqoeyp1FJ9WpXNkK9rw3+GdD0KkBcnwOV5LS125izoKkwgQDzf536yEWFsieSIlAFNK7OWPGgU34nlruYksK3gksufb1rHnENRIGFUBUHvK8lrNPSuJfdLMUaCX3Aki0ZovBI+EN9/kf+8Gs2OrGog3EzLu4cbg7kcCb13GjzyLqEZeXxUxGDygH7P2FyvUEFi3AGInh/H2BShmsJyrbcX/oGctIbo3EVwkD4nO2ljji9bxV1S4FWm8ZqRG44KnVG3UMpckEaC4UgR2fd3c++jwymoK4v4KcRaRzMtY5iXUPZs6ConNA8RAJKCkkjFpdslIs/Af4O01ov19GTgEQgIdo+IiOtwrtrEeg5jMBioeavCvq4TYqZHsO27C4wZLS0GWBpoTkIEUICJgdUnui6swjmmNREmg3srUZe8isSW9P4g5i/Ti22J7H0c2Ii6gvcBaAWUGzuGkpJTnFSgFtmn3D4bO2A+z2MruRUfmaCOJuIyc/sHk1OklKAG2aQ8YhZ+9cNM+mrNYn7waxISueQAHJQDsBcb8H7suevz8bRdj38TJQ0f9b1aC2QE4sXDpiUechVrGEpZ3tZ5dRYxsHMrrSkqXa2Dng+a+J5CNf/q1h/sZIynTWXaVnruSeSupLX2cRxF46Ehg7UJltY+PEPUaRNScJK2c5azQc5eztHJC7RNlXow5S7Siz8UO/fSCdnEoiOfI0Z7BvItY7kot60rinkJHJ8nJaiSPtb0TfKcKUV4I0o3nQJxFNPMyLfcaLXMxdRTiBJ84JK4i1Fxg+ZOiZapXXhilqdNZ9jIt92qWXnGeHoQJBxAmw3s5i1xoWjnLWcFyrmJpcylzwl/dzKoINyorgDh2FhoAjQyaXqnlXqNnX0nd0xDoX/FQr9X4R5ByVEeQoBQgAjqLWOZiPfdqlrmYOgpwbDqkOQ818O560bFZ+A+hLcs2+RZb1uUXiKTNztrghuXAu4etZKonPkLa47mw3OVa+sIxIRclwjx0jHdu5x01oqNWBg4pyweyp3ddMcNR8ZS95HZMNkCSh/zvXCVPDSdzHk96KADdQdLKtZyVeu4KmjYXqR1Gx2SSB3jgEO+o5R2bRWedDB0FK3y6wbbPn5aARk7Kiu3MnpdcFYu1vC5OVSfkAZ32XIwM6l2o5V6j5VxOU6YiMhwNj8fahX8/79jKO6pF104ZaQTL6hkBOk9KgICKtgrfnqQDZLW+OTS5SEAC4CximR/Tc6/RMxdTR8GoCoiRE8K3x2qvER3VwrdbRVpQqHhWABM+pULAft722AMkI804OC7AKEmdrmcv03JXsvQFRPfiSFlWhBp4907eXsM7tsrAfhU9hbInVTKCBlslgHjKWVp50gFCau8XICNIhe5peuHNes5VzFNOqGMkvqEIi+BR3rWdt1eLzjoZOKAsP8iesZKRzEX12gRQgO4yR8VTRHMnHSBi7zdfKRVJm+ta+hqzTxr2/i2/CBzinbW906dHwYqcGWMYLijqLFAIoO7BlDLmuVhLv1TPXU6NnP41pyQAZEw6txtZgVZ2d4LoKAARPSkC+0VHLW9/X3TXq3ATcAtwpHNRpxEBQKahvYCkzqKeCi29krpnEEd+X5uAF0SC+vEK0TxDsWyz6N7DO2qs9i3KVy+jJ3rmouLpVwYjCUrigqZ7SEqZljaPpS9knouoq6y/Hl1QT5oYAwBkNb1iFN2C/Vm2awdvrxadW4X/gIq1nx4bGDbLniUmwBg68mnqbOapYN5KkjqTOfJhpK5DMgDKAsIA+NmlVKv5lWDtGqP0HiAa746DUisDHyrTD6oHkZEQSnwgI84mrjLmmad5K6nnYuoqIf26G3pdx7B1cqN1aoMMNQIAuibrmVdqWUsGrPonxZO2QscCa+eB5TtLjhBAgQBgmkJEy1S9E3TDcpNRgYr7lghAGbFPIqmzmHcBS69k7plxNjn/X4ieeDWy+xHZVYenIwwAIEDSFznmfseWvexCACTN7u615RBuhNF3JvRlE9S9xFVM0y6m6RXMczF1lQ4mJgOu8KEnIzu+gtIEAqCAUkAEwUH1tjAY839sL12DSfeDNDd1Fotg48DmBhO2xABIGTjyaOos6q1g3kqWOocmICYD98ccfzlS9xAiBwDNmY2Tbmy1plqCZttPGl1/ibbVoYxEtn+ROotsOSuSK0EKIPLhM5Gt/5jIQRB6mfWMmKSiq4R55jPvAuqZR11lwxKTgZNTZqfvrUvQf0gpMHIq9rAvf+s/arfu3MMta3Jhwf13LPvM9E3RD34BCtBb7q56l551X0VS0h2Kh3ybrhWt7wyKkTorPcgY2iehe6bmraDplcw9izjyCdHHcD+RY8+HN38eKeiOzP3en113z3NtzY3U0BGAcwFAn/zeF9fMej7cuE4hOD/2spG/KrkJM2RO16JngzW3idYNcfOkoI8LC3oqcRWztIto+kLNM5+mlKGWlrwSkdX2FiCABDrpUz/42a625ka997oHXSeci+//9MWP//bTGdrb3JRW21tJBwhAMUehe8mrkcO/NBt+r4IfgOKgp1P3TOqtYN75NG0Otecj0U+TkgKlZBRQwyTUG2XoKAIQCu1q2ta6TcSm9aFhRttaW3c26Fc7vMJsl8GjZxsSlqycPQBhDue0+x1TvyAizUqa1JZJtLR+QbmMtb1tNr3Mu3eC5QNmpykztEnX2SZdN4KA9jyhek8TqaRCCBxgKkpZlkIHBQDs/fIFuh4HkTFHEQxcgD0WqvsSb/4TSIUICCARVHuddez30fRFzvn/rqcvGqPoJ48DKAkZrHHGlJLWE02Unul3kVK6Uz2zCsFq7QQA7BszEhinxQMHAxuvEU2vICokoBk2w51hszuRABJQHTWBjdfGhsy9Jba0jMXxzgVy8s9fuuNjNsNlmVbPHS5C8nDsjluvK9PW85ilAFjf+2zG55pAwYOBjR+XbZsUAd1wk6I79/lmH2+HdDfOyW7ST/wm6mtABcqZn1q1iTmLx6oJFyXYi1e90nTTIz96+cixBiGl1+O545Zrv/EpvzrwTSk5OArcy7cxI2ucAQp/+IvI1nsIAebIOlXw2INPHly7/r1IJKxp+vx5c3/0tapy87ux9nolQZ96r6viqdEbuNChJyPbHqAUlVL27Pldabfsa0mLmGpKrlWE62MNf5RCKgWOBb+yl955tr8/DgBJafnXXyHb3ycIcsYPVj3SvGn9Bs1pR0SllBWNFUwuWffM9blN93IzDEZO6oo6et47kBJM0Ya23x879BRSAAWEgGa4kFAe9XHe06xom/mQc94PsS/tjAMHyegJ4d8LADZP0Wt7czdtek93OeJ3UiGizW40HTn8q9c6bTmLQIGKtnLfnjGxFc75TxoXPwZahpIgBcTCwWjAx634jGu2UfET57zHsB8g49DkpGLtwAOggLqKaze2gRIAWp/ZDMa27T7Mr5sCsB4UQOTEWNlT5/Qv2yatijX9kZ/cKKPNCIiOAi1rqV5wI3NOnjD3SSMFJAACpGXT2UC3j0ibpiGEeyAjY9qKm1LGZn4NZn5NSRMA8ExMM3CeYRxUjBg5qHkAgfsOXT4/C3XbuTzIVdUlM6h/NyAAIcRZlJTXRHTsE/HhRLnTntiymbcSFEQDp5ZO2r765lVWKGJxLqXkQpjB8GVLlnz+8mj4VB0AEFcxdc8BGMdLHMbDzEeb/xx6dxWipFSXU//1J2vTf//yO6faO1wu5zXLLvnGLd60poet8CklwFb+Xdeshz9qACmlZHDrnebhZ5ECAbDnr+h2XNEVSXHZwulym9n4J2HFlAKasdB9+Rv9I7iPxJ32wuoOVa+2jv85PgJHEAgFKUEKAAIggHjnOi97SUuZCgAfRYAUgBKR8P5/i334cwi3xScxey7s1V1a0c3OOd+iRg4AfEQBOitQarRa37K6alWsE1kKS52j5SxjqbNwoty0M64AKVA4sa/7GudrpHDCX4b2/914n2f7ZO23AAAAAElFTkSuQmCC';

/* ===================== Data ===================== */
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
const fmt=n=>Math.round(n).toLocaleString('fr-FR').replace(/ /g,' ');
const F=n=>fmt(n)+' FCFA';
const STORE={name:'Maison Ndolo',handle:'maison-ndolo',domain:'maison-ndolo.axsoafrica.com',email:'contact@maisonndolo.cm',city:'Akwa, Douala',country:'Cameroun'};
const PRODUCTS=[
 {t:'Robe pagne wax « Kribi » — coupe évasée',cat:'Robes & ensembles',stock:42,price:18500,c:['#d9480f','#f59f00','#1864ab']},
 {t:'Huile de karité brute bio 250 ml',cat:'Soins du corps',stock:118,price:4500,c:['#f4e4bc','#c9a96e','#8d6e3c']},
 {t:'Savon noir africain au miel — lot de 3',cat:'Soins du corps',stock:96,price:6000,c:['#3b2f2f','#6d4c41','#a1887f']},
 {t:'Sac cabas en raphia tressé main',cat:'Maroquinerie',stock:17,price:22000,c:['#d4b483','#a67c52','#5c4033']},
 {t:'Chemise Toghu brodée homme',cat:'Mode homme',stock:25,price:27500,c:['#111','#e03131','#f08c00']},
 {t:'Sandales cuir artisanal Ngaoundéré',cat:'Chaussures',stock:9,price:15000,c:['#7b4a2a','#a0522d','#deb887']},
 {t:'Poudre de moringa 200 g',cat:'Épicerie fine',stock:64,price:3500,c:['#5c940d','#94d82d','#2b8a3e']},
 {t:'Café Arabica de l’Ouest — moulu 500 g',cat:'Épicerie fine',stock:51,price:5500,c:['#3e2723','#795548','#d7ccc8']}
];
const NAMES=['Moussa Salamatou','Nicole Ebode','Stevia Ngo Mbaï','Kombo Bida','Éric Tchoupo','Bodo Touté','César Fotso','Achille Mbarga','Mbessek Laure','Assabala Ali','Samson Mandassera','Grâce Ngono','Junior Ewane','Patricia Essomba','Hervé Nkoulou','Mireille Abena','Yannick Djoko','Carine Ondoua','Ibrahim Bello','Danielle Ngassa','Franck Kamga','Sandrine Mvogo','Paul Biya Nanga','Aïcha Mohamadou','Brice Nana','Linda Tchana','Rodrigue Etoa','Vanessa Mballa','Arnaud Feudjio','Clarisse Ayissi'];
const CITIES=['Akwa, Douala','Bonamoussadi, Douala','Bonapriso, Douala','Makepe, Douala','Bastos, Yaoundé','Mvog-Mbi, Yaoundé','Biyem-Assi, Yaoundé','Bafoussam','Limbé','Garoua','Kribi','Buea'];
const CHANNELS=['Commande WhatsApp','Boutique en ligne','Formulaire COD','Facebook & Instagram','Boutique en ligne','Commande WhatsApp'];
const PAY=[['Paiement à la livraison','att'],['Payé · MTN MoMo','ok'],['Payé · Orange Money','ok'],['Paiement à la livraison','att'],['En attente','warn']];
const TIMES=['14:48','13:40','12:33','11:05','10:19','09:56','09:41','09:25','08:23','08:08','07:52','07:30'];
const DAYS=['Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Aujourd’hui','Hier','Hier','Hier','Hier','Hier','lundi','lundi','dimanche','dimanche','dimanche','dimanche','dimanche','samedi'];
const ORDERS=Array.from({length:50},(_,i)=>{const p=PAY[Math.floor(rnd()*PAY.length)];const qty=1+Math.floor(rnd()*3);const pr=PRODUCTS[Math.floor(rnd()*PRODUCTS.length)];
 return {n:1210-i,date:(DAYS[i%DAYS.length]||'vendredi')+' à '+TIMES[i%TIMES.length],cust:NAMES[i%NAMES.length],ch:CHANNELS[i%CHANNELS.length],total:pr.price*qty+1500,pay:p,ful:i<14?['Non traitée','att']:(rnd()>.35?['Traitée','neutral']:['Non traitée','att']),items:qty,del:i<14?'Livraison Douala':(rnd()>.5?'Livraison Yaoundé':'Retrait en point relais'),prod:pr}});
const CUSTOMERS=NAMES.map((n,i)=>({n,city:CITIES[i%CITIES.length]+', Cameroun',mk:rnd()>.55,orders:1+Math.floor(rnd()*rnd()*6),spent:0})).map(c=>({...c,spent:c.orders*(9000+Math.floor(rnd()*14000))}));

/* ===================== Helpers ===================== */
const badge=(t,tone='',pip='')=>`<span class="badge ${tone}">${pip?`<i class="pip ${pip}"></i>`:''}${t}</span>`;
function spark(data,w=64,h=22,color='#2a6fdb'){const mx=Math.max(...data),mn=Math.min(...data);const pts=data.map((v,i)=>`${(i/(data.length-1)*w).toFixed(1)},${(h-2-(v-mn)/((mx-mn)||1)*(h-4)).toFixed(1)}`).join(' ');return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`}
function series(n,base,vol,trend=0){const a=[];let v=base;for(let i=0;i<n;i++){v=Math.max(0,v+(rnd()-.5)*vol+trend);a.push(v)}return a}
function lineChart(a,b,{h=180,labels=[],yfmt=v=>fmt(v),color='#2a6fdb',area=false,w=600}={}){
 const W=w,H=h,pl=44,pb=22,pt=8;const all=a.concat(b||[]);const mx=Math.max(...all)*1.15||1;
 const X=i=>pl+i/(a.length-1)*(W-pl-8),Y=v=>pt+(H-pt-pb)*(1-v/mx);
 const path=s=>s.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
 let g='';for(let k=0;k<=2;k++){const v=mx/2*k,y=Y(v);g+=`<line x1="${pl}" x2="${W-8}" y1="${y}" y2="${y}" stroke="#ebebeb"/><text x="${pl-8}" y="${y+4}" text-anchor="end" font-size="10" fill="#8a8a8a">${yfmt(v)}</text>`}
 const lb=labels.map((l,i)=>`<text x="${X(Math.round(i*(a.length-1)/(labels.length-1)))}" y="${H-4}" text-anchor="middle" font-size="10" fill="#8a8a8a">${l}</text>`).join('');
 return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="height:auto">${g}${lb}${area?`<path d="${path(a)} L${X(a.length-1)} ${Y(0)} L${X(0)} ${Y(0)}Z" fill="${color}" opacity=".08"/>`:''}${b?`<path d="${path(b)}" fill="none" stroke="#9fc3f6" stroke-width="1.6" stroke-dasharray="3 3"/>`:''}<path d="${path(a)}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/></svg>`}
function prodThumb(p,s=40){const [a,b,c]=p.c;return `<span class="thumb" style="width:${s}px;height:${s}px"><svg width="${s-8}" height="${s-8}" viewBox="0 0 32 32"><rect x="5" y="8" width="22" height="20" rx="4" fill="${a}"/><rect x="9" y="4" width="14" height="6" rx="2" fill="${b}"/><rect x="9" y="14" width="14" height="4" rx="1" fill="${c}" opacity=".9"/></svg></span>`}
function ixBar(tabs=['Tous'],ph='Rechercher et filtrer',extra=''){return `<div class="ix-bar"><button class="ix-tab on">${tabs[0]} ${I('chevUD','s')}</button>${tabs.slice(1).map(t=>`<button class="ix-tab">${t}</button>`).join('')}<label class="ix-search">${I('search','s')}<input placeholder="${ph}" oninput="filterRows(this)"></label>${extra}<button class="mini" title="Colonnes">${I('cols','s')}</button><button class="mini" title="Trier">${I('sort','s')}</button></div>`}
function table(cols,rows,{check=true,pager=true}={}){
 return `<div class="ix-wrap"><table class="ix"><thead><tr>${check?`<th class="cb"><span class="cbx" onclick="event.stopPropagation();toggleAll(this)"></span></th>`:''}${cols.map(c=>`<th class="${c.cls||''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr ${r._go?`onclick="go('${r._go}')"`:''}>${check?`<td class="cb"><span class="cbx" onclick="event.stopPropagation();this.closest('tr').classList.toggle('sel')"></span></td>`:''}${r.cells.map((c,i)=>`<td class="${cols[i].cls||''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${pager?`<div class="pager"><button>${I('chevL','s')}</button><span>1-${rows.length}</span><button>${I('chevR','s')}</button></div>`:''}`}
function toggleAll(el){const on=!el.classList.contains('on');el.classList.toggle('on',on);el.closest('table').querySelectorAll('tbody tr').forEach(tr=>tr.classList.toggle('sel',on))}
function filterRows(inp){const q=inp.value.toLowerCase();inp.closest('.card').querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none')}
function header(icon,title,actions='',extra=''){return `<div class="ph"><h1>${I(icon,'s')}${title}</h1>${extra}<span class="sp"></span>${actions}${actions?`<button class="mini ph-more" onclick="moreMenu(this)" aria-label="Plus d’actions">${I('dots','s')}</button>`:''}</div>`}
function empty(ill,title,text,actions,foot=''){return `<div class="card"><div class="empty"><div class="ill">${ill}</div><h3>${title}</h3><p>${text}</p><div class="row" style="justify-content:center">${actions}</div></div></div>${foot?`<p class="foot-link">${foot}</p>`:''}`}
function mstrip(per,items){return `<div class="mstrip"><div class="per">${I('cal','s')}${per}</div>${items.map(m=>`<div class="m"><div class="t"><span class="dotted">${m.t}</span></div><div class="v"><span class="strong">${m.v}</span>${m.d?`<span class="delta ${m.dn?'down':''}">${m.dn?'↘':'↗'} ${m.d}</span>`:''}${m.s?spark(m.s):''}</div></div>`).join('')}</div>`}
/* Illustrations — sobres, en aplats (style plateforme) */
const ILL={
draft:`<svg viewBox="0 0 200 150"><ellipse cx="100" cy="128" rx="62" ry="8" fill="#f1f1f1"/><circle cx="100" cy="74" r="52" fill="#e8f5ef"/><rect x="66" y="30" width="68" height="88" rx="6" fill="#fff" stroke="#d4d4d4"/><rect x="76" y="44" width="30" height="22" rx="3" fill="#EBA900"/><rect x="76" y="74" width="48" height="5" rx="2" fill="#e3e3e3"/><rect x="76" y="84" width="40" height="5" rx="2" fill="#e3e3e3"/><rect x="76" y="94" width="44" height="5" rx="2" fill="#e3e3e3"/><path d="M58 120a42 18 0 0 1 84 0" fill="#1f7a55"/></svg>`,
po:`<svg viewBox="0 0 200 150"><circle cx="112" cy="72" r="46" fill="#fbecd0"/><rect x="58" y="34" width="58" height="80" rx="5" fill="#fff" stroke="#d4d4d4"/><rect x="68" y="48" width="10" height="10" rx="2" fill="#1f7a55"/><rect x="84" y="50" width="24" height="5" rx="2" fill="#e3e3e3"/><rect x="68" y="66" width="10" height="10" rx="2" fill="#1f7a55"/><rect x="84" y="68" width="24" height="5" rx="2" fill="#e3e3e3"/><rect x="68" y="84" width="10" height="10" rx="2" fill="#1f7a55"/><rect x="84" y="86" width="24" height="5" rx="2" fill="#e3e3e3"/><path d="M118 52l30 10v44l-30-10z" fill="#e2a44a"/><path d="M118 52l-14 8v44l14-8z" fill="#c98a2e"/></svg>`,
transfer:`<svg viewBox="0 0 200 150"><circle cx="100" cy="72" r="50" fill="#f1f1f1"/><rect x="40" y="46" width="44" height="56" rx="6" fill="#fff" stroke="#d4d4d4"/><rect x="116" y="46" width="44" height="56" rx="6" fill="#fff" stroke="#d4d4d4"/><path d="M50 62h24v26H50z" fill="#9aa5b1"/><path d="M126 62h24v26h-24z" fill="#4fb3a9"/><circle cx="100" cy="74" r="15" fill="#1f7a55"/><path d="M93 74h13M101 69l5 5-5 5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="62" cy="40" r="5" fill="#1f7a55"/><circle cx="138" cy="40" r="5" fill="#1f7a55"/></svg>`,
gift:`<svg viewBox="0 0 200 150"><rect x="56" y="34" width="88" height="82" rx="12" fill="#4fb3a9"/><rect x="94" y="34" width="12" height="82" fill="#2f8f85"/><rect x="56" y="70" width="88" height="12" fill="#2f8f85"/><path d="M100 70c-10-18-30-16-26-4 3 8 26 4 26 4zM100 70c10-18 30-16 26-4-3 8-26 4-26 4z" fill="#2f8f85"/></svg>`,
b2b:`<svg viewBox="0 0 200 150"><rect x="62" y="30" width="62" height="86" rx="4" fill="#4fb3a9"/><rect x="72" y="40" width="42" height="10" fill="#fff"/><rect x="72" y="56" width="42" height="8" fill="#e05252"/><rect x="72" y="70" width="42" height="8" fill="#fff" opacity=".8"/><rect x="72" y="84" width="42" height="8" fill="#fff" opacity=".8"/><rect x="128" y="62" width="30" height="5" rx="2" fill="#d4d4d4"/><rect x="128" y="74" width="20" height="8" rx="4" fill="#1f7a55"/></svg>`,
blog:`<svg viewBox="0 0 200 150"><rect x="68" y="30" width="64" height="88" rx="5" fill="#fff" stroke="#d4d4d4"/><rect x="80" y="58" width="40" height="30" rx="3" fill="#cfe7f5"/><path d="M80 88l12-12 9 9 6-6 13 9z" fill="#4fb3a9"/><rect x="80" y="96" width="40" height="4" rx="2" fill="#e3e3e3"/><rect x="80" y="104" width="30" height="4" rx="2" fill="#e3e3e3"/><g transform="translate(78 14)"><rect width="44" height="18" rx="5" fill="#fff" stroke="#d4d4d4"/><text x="9" y="13" font-size="10" font-weight="700" fill="#303030">B  I  U</text></g></svg>`,
catalog:`<svg viewBox="0 0 200 150"><rect x="66" y="34" width="68" height="84" rx="6" fill="#fff" stroke="#d4d4d4"/>${[50,68,86].map(y=>`<circle cx="80" cy="${y}" r="5" fill="#1f7a55"/><rect x="90" y="${y-3}" width="34" height="6" rx="3" fill="#e3e3e3"/>`).join('')}<path d="M118 34h16v16z" fill="#EBA900"/></svg>`,
campaign:`<svg viewBox="0 0 200 150"><path d="M58 42h34l8 8h42v62H58z" fill="#3b82f6"/><circle cx="96" cy="84" r="16" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="60 40"/><rect x="118" y="74" width="16" height="4" rx="2" fill="#fff"/><rect x="118" y="84" width="12" height="4" rx="2" fill="#fff"/></svg>`
};

/* ===================== Navigation ===================== */
const NAV=[
 {id:'home',ic:'home',t:'Accueil'},
 {id:'orders',ic:'orders',t:'Commandes',count:'1 209',sub:[['drafts','Brouillons'],['checkouts','Paniers abandonnés']]},
 {id:'products',ic:'tag',t:'Produits',sub:[['collections','Collections'],['inventory','Stock'],['purchase-orders','Bons de commande'],['transfers','Transferts'],['gift-cards','Cartes-cadeaux']]},
 {id:'customers',ic:'user',t:'Clients',sub:[['segments','Segments'],['companies','Entreprises']]},
 {id:'growth',ic:'gauge',t:'Croissance',sub:[['attribution','Attribution'],['autopilot','Autopilot'],['campaigns','Campagnes marketing']]},
 {id:'discounts',ic:'disc',t:'Réductions'},
 {id:'metaobjects',ic:'img',t:'Contenu',sub:[['metaobjects','Métaobjets'],['files','Fichiers'],['menus','Menus'],['articles','Articles de blog']]},
 {id:'markets',ic:'globe',t:'Marchés',sub:[['catalogs','Catalogues'],['rollouts','Déploiements']]},
 {id:'analytics',ic:'bars',t:'Analyses de données',sub:[['reports','Rapports'],['live','Vue en direct']]},
];
const CHANNELS_NAV=[
 {id:'online-store',ic:'store',t:'Boutique en ligne',sub:[['pages','Pages'],['preferences','Préférences']]},
 {id:'agentic',ic:'spark',t:'Agentique'},
 {id:'whatsapp',ic:'wa',t:'WhatsApp Business'},
 {id:'social',ic:'meta',t:'Facebook & Instagram',dot:1},
];
const APPS_NAV=[{id:'cod',ic:'receipt',t:'Formulaire COD',sub:[['cod','Tableau de bord'],['cod-fraud','Prévention de la fraude'],['cod-plans','Plans de facturation']]}];
function parentOf(r){for(const g of [...NAV,...CHANNELS_NAV,...APPS_NAV]){if(g.id===r)return g.id;if(g.sub&&g.sub.some(s=>s[0]===r))return g.id}return null}
function navItem(g,r){const par=parentOf(r);const open=par===g.id;const subActive=g.sub&&g.sub.some(s=>s[0]===r&&s[0]!==g.id);
 return `<a class="nav-item ${(r===g.id||(open&&!subActive))&&!(g.id==='metaobjects'&&r!=='metaobjects'&&open)?'active':''} ${open&&subActive?'':''}" href="#${g.id}">${I(g.ic)}${g.t}${g.count?`<span class="count">${g.count}</span>`:''}${g.dot?'<span class="dot"></span>':''}</a>${g.sub?`<div class="nav-sub ${open?'open':''}">${g.sub.map(s=>`<a href="#${s[0]}" class="${s[0]===r&&!(g.id===s[0]&&false)?'active':''}">${s[1]}</a>`).join('')}</div>`:''}`}
function renderNav(r){
 document.getElementById('nav').innerHTML=`
 <div class="nav-top"><a class="logo" href="#home"><img src="${LOGO}" alt=""><span>AXSO</span></a><button class="icon-btn" title="Réduire">${I('panel','s')}</button></div>
 <div class="search" onclick="openCmdk()">${I('search','s')}<span>Rechercher</span><kbd>Ctrl K</kbd></div>
 <div class="nav-scroll">
  ${NAV.map(g=>navItem(g,r)).join('')}
  <div class="nav-label" onclick="openChannels()">Canaux de vente ${I('chevR','s')}</div>
  ${CHANNELS_NAV.map(g=>navItem(g,r)).join('')}
  <div class="nav-label" onclick="openApps()">Applications ${I('chevR','s')}</div>
  ${APPS_NAV.map(g=>navItem(g,r)).join('')}
 </div>
 <div class="nav-bottom">
  <a class="nav-item" href="#p-general">${I('gear')}Paramètres</a>
  <div class="store-chip"><span class="store-av">MN</span><span style="font-weight:550">${STORE.name}</span><span class="bell">${I('bell','s')}<b>3</b></span></div>
 </div>`;
}
/* Settings nav */
const SET=[['p-general','store','Général'],['p-plan','receipt','Forfait'],['p-billing','money','Facturation'],['p-users','users','Utilisateurs'],['p-payments','card','Paiements'],['p-checkout','orders','Paiement (checkout)'],['p-accounts','user','Comptes clients'],['p-shipping','truck','Expédition et livraison'],['p-taxes','receipt','Taxes et droits de douane'],['p-locations','pin','Emplacements'],['p-apps','grid','Applications'],['p-channels','store','Canaux de vente'],['p-domains','globe','Domaines'],['p-events','bolt','Événements clients'],['p-notifications','bell','Notifications'],['p-meta','db','Champs méta et métaobjets'],['p-languages','lang','Langues'],['p-privacy','shield','Confidentialité des clients'],['p-policies','doc','Politiques']];
function renderSnav(r){document.getElementById('snav').innerHTML=`
 <a class="back" href="#home">${I('chevL','s')}Paramètres</a>
 <div class="search" style="margin:6px 0 10px">${I('search','s')}<span>Rechercher dans les paramètres</span></div>
 <div class="nav-scroll">
 <div class="storecard"><span class="store-av">MN</span><div style="min-width:0"><div style="font-weight:600;color:#fff">${STORE.name}</div><div class="small" style="color:#a1a1a1">${STORE.domain}</div></div></div>
 ${SET.map(s=>`<a class="sitem ${s[0]===r?'active':''}" href="#${s[0]}">${I(s[1])}${s[2]}</a>`).join('')}
 </div>
 <div class="user"><span class="av">AK</span><div style="min-width:0"><div style="font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Arthur K.</div><div class="small" style="color:#a1a1a1">arthur@axsoafrica.com</div></div></div>`}

/* ===================== Views ===================== */
const V={};
V.home=()=>{
 const vis=series(30,250,120,2);
 return `<div class="page narrow">
 <div class="kbar"><div style="flex:1;text-align:left"><span class="strong" style="font-weight:550">30 derniers jours</span> · <span>Tous les canaux</span></div>
  <div class="k hide-m"><div class="l">Visites</div><div class="v">7 960 <span class="delta">↗ 51 %</span></div></div>
  <div class="k hide-m"><div class="l">Ventes totales</div><div class="v">6,47 M FCFA <span class="delta down">↘ 7 %</span></div></div>
  <div class="k hide-m"><div class="l">Commandes</div><div class="v">414 <span class="delta down">↘ 6 %</span></div></div>
  <div class="k hide-m"><div class="l">Taux de conversion</div><div class="v">5,2 % <span class="delta">↗ 0,4</span></div></div>
  <div style="flex:1;text-align:right"><a href="#live" class="muted">Visiteurs en direct <b class="strong">4</b><span class="live-dot"></span></a></div></div>
 <div class="hero"><h1>Bonjour Arthur !<br>Continuons à développer votre entreprise.</h1></div>
 <div class="ask"><textarea id="askta" placeholder="Demandez à AXIA : « Quels produits relancer cette semaine ? »" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();openAxia(this.value);this.value=''}"></textarea>
  <div class="bar"><span class="axia-av">${AXIA_SVG}</span><span class="sp" style="flex:1"></span><button class="btn ghost sm">${I('hist','s')}Récents</button><span class="sep"></span><button class="mini">${I('plus','s')}</button><button class="mini">${I('mic','s')}</button><button class="mini">${I('wave','s')}</button></div></div>
 <div class="chips"><a class="chip" href="#orders">Traiter les commandes <b>14</b></a><a class="chip" href="#orders">Confirmer les paiements à la livraison <b>38</b></a><a class="chip" href="#checkouts">Relancer les paniers <b>6</b></a></div>
 <div class="feed">
  ${fc(artConversion(),'Améliorez votre taux de conversion','Augmentez la part de visiteurs qui achètent sur votre boutique grâce à un parcours de commande en 3 étapes.','Démarrer',"go('p-checkout')",true)}
  ${fc(artMomo(),'Activer Mobile Money','Acceptez MTN Mobile Money et Orange Money en plus du paiement à la livraison. Encaissement sous 24 h.','Activer les paiements',"go('p-payments')")}
  ${fc(artDomain(),'Obtenez un domaine correspondant à Maison Ndolo','Nous avons trouvé des noms de domaine disponibles qui correspondent à votre boutique. Choisissez celui que vous préférez.','Choisir un domaine',"go('p-domains')")}
  ${fc(artShip(),'Vérifier les tarifs de livraison','Passez en revue les zones Douala, Yaoundé et villes secondaires configurées par défaut pour votre emplacement.','Vérifier les tarifs',"go('p-shipping')")}
  ${fc(`<div style="padding:14px 10px 0">${lineChart(series(14,30,14,-.6),series(14,40,10),{h:110,w:300})}</div>`,'Les visites en provenance de Yaoundé ont baissé de 21 %','Il s’agit d’un ralentissement de 21 %, passant de 412 à 326 visites par rapport à la semaine dernière.','Afficher le rapport',"go('reports')")}
  ${fc(`<div style="padding:14px 10px 0">${lineChart(series(14,30,12,.9),series(14,26,8),{h:110,w:300})}</div>`,'Robe pagne wax « Kribi » : ventes en hausse de 34 %','Les ventes de ce produit ont progressé de 34 %, passant de 412 500 FCFA à 552 750 FCFA sur la même période.','Afficher le rapport',"go('analytics')")}
  ${fc(artCatalog(),'Vendez directement sur WhatsApp','Synchronisez votre catalogue avec WhatsApp Business et recevez les commandes directement dans AXSO.','Connecter WhatsApp',"go('whatsapp')",false,true)}
  ${fc(artApps(),'Augmenter la visibilité et la conversion avec des applications','Trouvez et fidélisez des clients grâce à des applications de marketing, de livraison et de service client.','Consulter le guide',"openApps()",false,true)}
  ${fc(artBoxes(),'Réalisez vos 100 premières ventes','Les frais de transaction AXSO sont offerts sur vos 100 premières commandes. Développez votre activité, le forfait s’autofinance.','Démarrer',"go('growth')",true)}
 </div></div>`};
function fc(art,t,p,cta,act,task=false,x=false){return `<div class="fc"><div class="art">${art}${task?'<span class="pill-dark"><i></i>0 tâche terminée</span>':''}</div>${x||!task?`<button class="x" onclick="this.closest('.fc').remove();toast('Recommandation masquée')">${I('x','s')}</button>`:''}<div class="bd"><h4>${t}</h4><p>${p}</p><div class="go"><button class="btn sm" onclick="${act}">${cta}</button></div></div></div>`}
function artConversion(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#fbe3c0"/><path d="M40 110c40-40 60 20 110-30s70-10 100-40" stroke="#e8b45a" stroke-width="10" fill="none" stroke-linecap="round" opacity=".6"/><rect x="38" y="62" width="58" height="54" rx="10" fill="#EBA900"/><path d="M52 78h30l-4 16H56z" fill="none" stroke="#0A1A33" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="102" r="3" fill="#0A1A33"/><circle cx="76" cy="102" r="3" fill="#0A1A33"/><circle cx="222" cy="46" r="24" fill="#EBA900"/><path d="M214 38l18 8-8 2-2 8z" fill="#0A1A33"/><path d="M140 70l14 4-6 3-2 6z" fill="#0A1A33"/></svg>`}
function artMomo(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#f3f3f3"/><g transform="translate(52 30)"><rect width="96" height="48" rx="8" fill="#fff" stroke="#e3e3e3"/><rect x="12" y="14" width="22" height="22" rx="5" fill="#ffcc00"/><text x="23" y="29" font-size="8" font-weight="800" text-anchor="middle" fill="#1a1a1a">MTN</text><text x="42" y="24" font-size="9" font-weight="650" fill="#1a1a1a">Mobile</text><text x="42" y="35" font-size="9" font-weight="650" fill="#1a1a1a">Money</text></g><g transform="translate(118 62)"><rect width="110" height="48" rx="8" fill="#1a1a1a"/><rect x="12" y="14" width="22" height="22" rx="5" fill="#ff7900"/><text x="42" y="24" font-size="9" font-weight="650" fill="#fff">Orange</text><text x="42" y="35" font-size="9" font-weight="650" fill="#fff">Money</text><text x="96" y="36" font-size="8" fill="#a1a1a1" text-anchor="end">✓</text></g></svg>`}
function artDomain(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#f3f3f3"/><rect x="48" y="44" width="184" height="36" rx="18" fill="#fff" stroke="#e3e3e3"/><text x="140" y="67" text-anchor="middle" font-size="13" fill="#5b3cc4" font-family="Inter">maisonndolo.cm</text><path d="M196 74l22 22-9 1 6 11-4 2-6-11-7 6z" fill="#1a1a1a" stroke="#fff" stroke-width="1.5"/></svg>`}
function artShip(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#f3f3f3"/><g transform="translate(96 24)"><path d="M44 0l44 20v52L44 92 0 72V20z" fill="#e3e3e3"/><path d="M44 0l44 20-44 20L0 20z" fill="#fff" stroke="#d4d4d4"/><path d="M44 40v52" stroke="#d4d4d4"/><rect x="54" y="52" width="26" height="14" rx="2" fill="#fff" transform="skewY(-24)" /></g><g transform="translate(40 76)"><rect width="52" height="30" rx="6" fill="#EBA900"/><circle cx="12" cy="32" r="6" fill="#0A1A33"/><circle cx="40" cy="32" r="6" fill="#0A1A33"/></g></svg>`}
function artCatalog(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#e6f4ea"/><rect x="100" y="16" width="80" height="124" rx="14" fill="#fff" stroke="#cfe3d6"/><rect x="110" y="34" width="44" height="16" rx="8" fill="#d9fdd3"/><rect x="126" y="56" width="44" height="16" rx="8" fill="#f1f1f1"/><rect x="110" y="78" width="60" height="30" rx="6" fill="#fbe3c0"/><circle cx="212" cy="40" r="18" fill="#25d366"/><path d="M204 40l5 5 10-10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`}
function artApps(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#f3f3f3"/>${[[70,34,'#1a1a1a'],[122,34,'#EBA900'],[174,34,'#4fb3a9'],[70,80,'#3b82f6'],[122,80,'#0A1A33'],[174,80,'#e3e3e3']].map(([x,y,c])=>`<rect x="${x}" y="${y}" width="40" height="40" rx="10" fill="${c}"/>`).join('')}</svg>`}
function artBoxes(){return `<svg viewBox="0 0 280 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="280" height="140" fill="#7a3e2b"/><rect x="60" y="56" width="74" height="60" fill="#c8915a"/><rect x="60" y="56" width="74" height="10" fill="#b07a45"/><rect x="128" y="40" width="88" height="76" fill="#d9a46a"/><rect x="128" y="40" width="88" height="12" fill="#bf8a52"/><rect x="164" y="40" width="14" height="76" fill="#e9c08f"/></svg>`}

V.orders=()=>`<div class="page">${header('orders','Commandes',`<button class="btn">Exporter</button><button class="btn">Plus d’actions ${I('chevD','s')}</button><button class="btn primary" onclick="go('drafts')">Créer une commande</button>`)}
 ${mstrip('Aujourd’hui',[{t:'Commandes',v:'14',d:'75 %',s:series(12,4,4,.3)},{t:'Articles commandés',v:'19',d:'58 %',s:series(12,5,4,.3)},{t:'Retours',v:'0 FCFA',s:[0,0,0,0,0,0]},{t:'Commandes traitées',v:'6',s:series(12,2,2,.1)},{t:'Commandes livrées',v:'4',d:'12 %',s:series(12,2,2,.1)}])}
 <div class="card">${ixBar(['Toutes','Non traitées','Non payées','Ouvertes','Archivées'])}
 ${table([{h:'Commande'},{h:'Date ↓'},{h:'Client'},{h:'Canal'},{h:'Total',cls:'num'},{h:'Statut du paiement'},{h:'Statut du traitement'},{h:'Articles'},{h:'Mode de livraison'}],
  ORDERS.map(o=>({_go:'order-'+o.n,cells:[`<span class="strong">#${o.n}</span>`,o.date,o.cust,o.ch,F(o.total),badge(o.pay[0],o.pay[1],o.pay[1]==='ok'?'full':'half'),badge(o.ful[0],o.ful[1]==='neutral'?'':o.ful[1],o.ful[1]==='neutral'?'full':''),o.items+' article'+(o.items>1?'s':''),o.del]})))}</div></div>`;
V.order=(n)=>{const o=ORDERS.find(x=>x.n==n)||ORDERS[0];const sub=o.total-1500;return `<div class="page narrow">${header('orders',`<a href="#orders" class="muted">${I('chevL','s')}</a> #${o.n} ${badge(o.pay[0],o.pay[1],'half')} ${badge(o.ful[0],o.ful[1]==='neutral'?'':'att')}`,`<button class="btn">Rembourser</button><button class="btn">Modifier</button><button class="btn">Imprimer ${I('chevD','s')}</button><button class="btn">Plus d’actions ${I('chevD','s')}</button>`)}
 <p class="muted" style="margin:-6px 0 14px">${o.date} · ${o.ch}</p>
 <div class="grid" style="grid-template-columns:2fr 1fr;align-items:start"><div class="stack">
  <div class="card pad"><div class="row" style="margin-bottom:12px">${badge(o.ful[0],'att','half')}<span class="muted">${o.del}</span></div>
   <div class="row" style="gap:12px">${prodThumb(o.prod)}<div style="flex:1"><div class="link">${o.prod.t}</div><div class="small muted">${o.prod.cat}</div></div><span>${F(o.prod.price)} × ${o.items}</span><span class="strong" style="width:110px;text-align:right">${F(sub)}</span></div>
   <div class="divider"></div><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn">Créer une étiquette d’expédition</button><button class="btn primary" onclick="toast('Commande #${o.n} marquée comme traitée')">Marquer comme traitée</button></div></div>
  <div class="card pad"><div class="row" style="margin-bottom:12px">${badge(o.pay[0],o.pay[1],'half')}</div>
   <div class="row"><span style="width:120px">Sous-total</span><span class="muted" style="flex:1">${o.items} article(s)</span><span>${F(sub)}</span></div>
   <div class="row" style="margin-top:6px"><span style="width:120px">Livraison</span><span class="muted" style="flex:1">${o.del}</span><span>1 500 FCFA</span></div>
   <div class="row" style="margin-top:6px"><span class="strong" style="flex:1">Total</span><span class="strong">${F(o.total)}</span></div>
   <div class="divider"></div><div class="row"><span style="flex:1">Montant à encaisser à la livraison</span><span>${F(o.total)}</span></div>
   <div class="divider"></div><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn">Envoyer un lien MoMo</button><button class="btn primary" onclick="toast('Paiement enregistré')">Marquer comme payée</button></div></div>
  <div class="card pad"><h2>Chronologie</h2><div class="timeline" style="margin-top:10px"><div class="ev"><i class="g"></i><div style="flex:1">Commande passée par ${o.cust} via ${o.ch}.</div><span class="muted small">${o.date.split(' à ')[1]}</span></div><div class="ev"><i></i><div style="flex:1">Message de confirmation WhatsApp envoyé au client.</div><span class="muted small">${o.date.split(' à ')[1]}</span></div><div class="ev"><i></i><div style="flex:1">AXIA : risque de refus à la livraison <b>faible</b> (client avec 2 commandes livrées).</div><span class="muted small">${o.date.split(' à ')[1]}</span></div></div></div>
 </div><div class="stack">
  <div class="card pad"><h2>Notes</h2><p class="muted" style="margin:6px 0 0">Aucune note du client</p></div>
  <div class="card pad"><h2>Client</h2><p class="link" style="margin:8px 0 2px">${o.cust}</p><p class="muted small" style="margin:0">2 commandes</p><div class="divider"></div><h2 class="small">Coordonnées</h2><p class="small" style="margin:4px 0 0">+237 6 ${70+o.n%29} ${10+o.n%80} ${20+o.n%70} ${30+o.n%60}</p><div class="divider"></div><h2 class="small">Adresse de livraison</h2><p class="small" style="margin:4px 0 0">${o.cust}<br>${CITIES[o.n%CITIES.length]}<br>Cameroun</p></div>
  <div class="card pad"><h2>Risque de commande</h2><div style="height:6px;border-radius:3px;background:linear-gradient(90deg,#29845a 0 33%,#e3e3e3 33%);margin:10px 0 6px"></div><p class="small muted" style="margin:0">Faible · analyse AXIA</p></div>
 </div></div></div>`};
V.drafts=()=>`<div class="page narrow">${header('orders','Commandes provisoires')}${empty(ILL.draft,'Créer manuellement des commandes et des factures','Utilisez les commandes provisoires pour prendre des commandes reçues par téléphone ou WhatsApp, envoyer des factures aux clients et percevoir des paiements Mobile Money.',`<button class="btn primary" onclick="toast('Nouvelle commande provisoire')">Créer une commande provisoire</button>`,'En savoir plus sur la <span class="link">création de commandes provisoires</span>')}</div>`;
V.checkouts=()=>`<div class="page">${header('orders','Paniers abandonnés',`<button class="btn">Exporter</button>`,`<button class="btn ghost sm">Incomplets ${I('chevD','s')}</button>`)}
 <div class="card">${ixBar(['Tous'])}${table([{h:'Paiement'},{h:'Date de création'},{h:'Nom du client'},{h:'Région'},{h:'Statut de récupération'},{h:'Total',cls:'num'}],[
 ['#35841811165758','le 17 nov. à 21:14','Edgar-Ulrich Tendende','Littoral, Cameroun','Non récupéré','warn',27750],['#35841811165421','le 17 nov. à 18:02','Clarisse Ayissi','Centre, Cameroun','Récupéré','ok',18500],['#35841811164990','le 16 nov. à 10:47','Brice Nana','Ouest, Cameroun','Non récupéré','warn',6000],['#35841811164112','le 15 nov. à 22:31','Linda Tchana','Littoral, Cameroun','Relance envoyée','info',44000],['#35841811163876','le 14 nov. à 09:15','Rodrigue Etoa','Centre, Cameroun','Non récupéré','warn',15000],['#35841811163200','le 12 nov. à 16:40','Vanessa Mballa','Sud-Ouest, Cameroun','Récupéré','ok',9000]].map(r=>({cells:[`<span class="strong">${r[0]}</span>`,r[1],r[2],r[3],badge(r[4],r[5]),F(r[6])]})))}</div>
 <div class="card pad" style="margin-top:16px"><div class="row"><span class="axia-av">${AXIA_SVG}</span><div style="flex:1"><div class="strong">Relance automatique par WhatsApp</div><div class="muted">AXIA peut envoyer un rappel personnalisé 1 h après l’abandon. 3 paniers sur 10 sont récupérés en moyenne.</div></div><button class="btn" onclick="toast('Relance automatique activée')">Activer</button></div></div></div>`;

V.products=()=>`<div class="page">${header('tag','Produits',`<button class="btn hide-m">${I('eye','s')}Afficher en tant que</button><button class="btn">Importer</button><button class="btn">Exporter</button><button class="btn hide-m">Plus d’actions ${I('chevD','s')}</button><button class="btn primary" onclick="go('product-new')">Ajouter un produit</button>`)}
 <div class="mstrip"><div class="per">${I('cal','s')}30 jours</div><div class="m"><div class="t"><span class="dotted">Taux de vente moyen</span></div><div class="v strong">45,35 %</div></div><div class="m"><div class="t"><span class="dotted">Produits par jours de stock restants</span></div><div class="v muted">Sandales cuir : 6 jours</div></div><div class="m"><div class="t"><span class="dotted">Analyse ABC des produits</span></div><div class="v"><span class="strong" style="border-bottom:2px solid #2a6fdb">3,9 M FCFA A</span><span class="strong" style="border-bottom:2px solid #7c3aed">1,7 M FCFA B</span><span class="strong" style="border-bottom:2px solid #1bb6e8">0,8 M FCFA C</span></div></div></div>
 <div class="card">${ixBar(['Tous','Actifs','Brouillon','Archivés'])}${table([{h:''},{h:'Produit'},{h:'Statut'},{h:'Stock'},{h:'Catégorie'},{h:'Canaux',cls:'num'},{h:'Type de produit'},{h:'Fournisseur'}],PRODUCTS.map((p,i)=>({_go:'product-'+i,cells:[prodThumb(p),`<span class="strong" style="white-space:normal;display:block;max-width:260px">${p.t}</span>`,badge(i===7?'Brouillon':'Actif',i===7?'info':'ok'),p.stock<12?`<span style="color:#8e0b21">${p.stock} en stock</span>`:p.stock+' en stock',p.cat,i===7?'1':'4','',STORE.name]})))}</div></div>`;
V.product=(i)=>{const p=PRODUCTS[i]||{t:'',cat:'',stock:0,price:0,c:['#eee','#ddd','#ccc']};const isNew=i==='new';return `<div class="page narrow">${header('tag',`<a href="#products" class="muted">${I('chevL','s')}</a> ${isNew?'Ajouter un produit':p.t}`,isNew?'':`<button class="btn">Dupliquer</button><button class="btn">Aperçu</button><button class="btn">Plus d’actions ${I('chevD','s')}</button>`)}
 <div class="grid" style="grid-template-columns:2fr 1fr;align-items:start"><div class="stack">
 <div class="card pad"><label class="field"><span>Titre</span><input value="${p.t.replace(/"/g,'&quot;')}" placeholder="T-shirt à manches courtes"></label><label class="field"><span>Description</span><textarea>${isNew?'':'Pièce confectionnée à Douala par nos artisans partenaires. Finitions soignées, tissu 100 % coton.'}</textarea></label><div class="row small"><span class="axia-av">${AXIA_SVG}</span><span class="link" onclick="openAxia('Rédige une description produit pour '+${JSON.stringify(p.t||'mon produit')})">Générer une description avec AXIA</span></div></div>
 <div class="card pad"><h2>Supports multimédias</h2><div style="border:1px dashed #b5b5b5;border-radius:10px;padding:26px;text-align:center;margin-top:10px">${isNew?'':`<div style="display:inline-block;margin-right:8px">${prodThumb(p,72)}</div>`}<div class="row" style="justify-content:center;gap:8px;margin-top:8px"><button class="btn sm">Importer un nouveau fichier</button><button class="btn plain sm">Sélectionner un fichier existant</button></div><p class="small muted" style="margin:8px 0 0">Accepte les images, vidéos ou modèles 3D</p></div></div>
 <div class="card pad"><h2>Prix</h2><div class="grid g3" style="margin-top:10px"><label class="field"><span>Prix</span><input value="${isNew?'':fmt(p.price)+' FCFA'}"></label><label class="field"><span>Prix avant réduction</span><input placeholder="0 FCFA"></label><label class="field"><span>Coût par article</span><input value="${isNew?'':fmt(p.price*.45)+' FCFA'}"></label></div><div class="row"><span class="cbx on"></span>Facturer la taxe sur ce produit</div></div>
 <div class="card pad"><h2>Stock</h2><div class="row" style="margin:10px 0"><span class="cbx on"></span>Suivre la quantité</div><div class="lrow" style="padding:10px 0"><span style="flex:1">Entrepôt Akwa, Douala</span><input style="width:90px;height:30px;border:1px solid #8a8a8a;border-radius:8px;padding:0 8px" value="${p.stock}"></div></div>
 </div><div class="stack">
 <div class="card pad"><h2>Statut</h2><label class="field" style="margin:8px 0 0"><select><option>Actif</option><option>Brouillon</option></select></label></div>
 <div class="card pad"><h2>Publication</h2><div class="small" style="margin-top:8px">${['Boutique en ligne','WhatsApp Business','Facebook & Instagram','Agentique'].map(c=>`<div class="row" style="padding:3px 0">${I('check','s')}${c}</div>`).join('')}</div></div>
 <div class="card pad"><h2>Organisation du produit</h2><label class="field" style="margin-top:8px"><span>Catégorie</span><input value="${p.cat}"></label><label class="field"><span>Fournisseur</span><input value="${STORE.name}"></label><label class="field"><span>Collections</span><input value="Page d’accueil"></label></div>
 </div></div>
 <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" onclick="toast('Produit enregistré')">Enregistrer</button></div></div>`};
V.collections=()=>`<div class="page">${header('tag','Collections',`<button class="btn primary">Ajouter une collection</button>`)}<div class="card">${ixBar(['Toutes'])}${table([{h:''},{h:'Titre'},{h:'Produits',cls:'num'},{h:'Conditions'},{h:'Canaux de vente',cls:'num'}],[['Page d’accueil',8,''],['Nouveautés pagne wax',3,'Catégorie est égale à Robes & ensembles'],['Bien-être & soins',3,'Catégorie est égale à Soins du corps'],['Épicerie du terroir',2,'Catégorie est égale à Épicerie fine']].map(r=>({cells:[`<span class="thumb" style="width:32px;height:32px">${I('img','s')}</span>`,`<span class="strong">${r[0]}</span>`,r[1],`<span class="muted">${r[2]}</span>`,'4']})),{pager:false})}</div></div>`;
V.inventory=()=>`<div class="page">${header('tag','Stock',`<button class="btn">Comptages de stock</button><button class="btn">Exporter</button><button class="btn">Importer</button>`,`<button class="btn ghost sm">Entrepôt Akwa ${I('chevD','s')}</button>`)}<div class="card">${ixBar(['Tous'])}${table([{h:''},{h:'Produit'},{h:'SKU'},{h:'Indisponible',cls:'num'},{h:'Engagé',cls:'num'},{h:'Disponible',cls:'num'},{h:'En stock',cls:'num'}],PRODUCTS.map((p,i)=>{const e=Math.floor(p.stock*.2);return{cells:[prodThumb(p,32),`<span class="strong" style="white-space:normal;display:block;max-width:300px">${p.t}</span>`,`<span class="muted">MN-${1000+i*7}</span>`,'0',e,`<input style="width:70px;height:28px;border:1px solid #c9c9c9;border-radius:8px;padding:0 8px;text-align:right" value="${p.stock-e}" onclick="event.stopPropagation()">`,p.stock]}}))}</div></div>`;
V['purchase-orders']=()=>`<div class="page narrow">${header('tag','Bons de commande')}<div class="card">${ixBar(['Tous'])}<div class="empty"><div class="ill">${ILL.po}</div><h3>Gérez vos bons de commande</h3><p>Suivez et recevez le stock commandé auprès de vos fournisseurs, grossistes du marché Central ou importateurs.</p><button class="btn primary">Créer un bon de commande</button></div></div></div>`;
V.transfers=()=>`<div class="page narrow">${header('tag','Transferts')}${empty(ILL.transfer,'Déplacer le stock entre les emplacements','Déplacez et suivez le stock entre vos emplacements : entrepôt, boutique physique ou point relais partenaire.',`<button class="btn primary">Créer un transfert</button>`,'En savoir plus sur les <span class="link">transferts</span>')}</div>`;
V['gift-cards']=()=>`<div class="page narrow">${header('tag','Cartes-cadeaux',`<button class="btn disabled">Exporter</button>`)}${empty(ILL.gift,'Commencez à vendre des cartes-cadeaux','Ajoutez des produits cartes-cadeaux à vendre, ou créez des cartes-cadeaux et envoyez-les directement à vos clients par WhatsApp ou e-mail.',`<button class="btn">Créer une carte-cadeau</button><button class="btn primary">Ajouter un produit carte-cadeau</button>`)}</div>`;
V.customers=()=>`<div class="page">${header('user','Clients',`<button class="btn">Exporter</button><button class="btn">Importer</button><button class="btn primary">Ajouter un client</button>`)}
 <div class="mstrip"><div class="m"><div class="t">${fmt(CUSTOMERS.length*41)} clients</div><div class="v muted">100 % de votre base clients</div></div></div>
 <div class="card"><div class="ix-bar" style="height:auto;padding:10px 12px"><div style="flex:1;color:var(--subdued)">Décrivez votre segment, ex. « clients de Douala ayant commandé 2 fois »</div>${I('chevD','s')}</div>${ixBar(['Tous'],'Rechercher des clients')}${table([{h:'Nom du client'},{h:'Abonnement aux e-mails'},{h:'Emplacement'},{h:'Commandes',cls:'num'},{h:'Montant dépensé',cls:'num'}],CUSTOMERS.map(c=>({cells:[`<span class="strong">${c.n}</span>`,c.mk?badge('Abonné','ok'):badge('Non abonné'),c.city,c.orders+' commande'+(c.orders>1?'s':''),F(c.spent)]})))}</div></div>`;
V.segments=()=>`<div class="page">${header('user','Segments',`<button class="btn primary">Créer un segment</button>`)}<div class="card">${ixBar(['Tous'],'Rechercher des segments')}${table([{h:'Nom du segment'},{h:'% de clients',cls:'num'},{h:'Dernière activité'},{h:'Auteur'}],[['Clients ayant acheté au moins une fois','62 %'],['Clients fidèles (3+ commandes)','9 %'],['Abonnés WhatsApp','48 %'],['Paniers abandonnés (30 jours)','6 %'],['Clients Douala','41 %'],['Clients Yaoundé','27 %'],['N’ont pas commandé depuis 90 jours','18 %']].map(r=>({cells:[`<span class="strong">${r[0]}</span>`,r[1],'Mis à jour aujourd’hui',r[0].includes('Douala')||r[0].includes('Yaoundé')?'Arthur K.':'AXSO']})),{pager:false})}</div></div>`;
V.companies=()=>`<div class="page narrow">${header('user','Entreprises')}${empty(ILL.b2b,'Apportez la puissance de la personnalisation à votre activité B2B','Tout ce dont vous avez besoin pour la vente en gros au même endroit. Ajoutez une entreprise (revendeur, boutique, administration), attribuez une tarification personnalisée, des conditions de paiement à 30 jours et des acheteurs autorisés.',`<button class="btn primary">Ajouter une entreprise</button>`,'En savoir plus sur les <span class="link">entreprises</span>')}</div>`;

V.growth=()=>`<div class="page">${header('gauge','Croissance')}
 <div class="card pad" style="position:relative;padding:24px"><button class="mini" style="position:absolute;top:12px;right:12px">${I('x','s')}</button><div class="row" style="gap:24px;align-items:center"><div style="flex:1"><h2 style="font-size:20px;line-height:28px;font-weight:650;letter-spacing:-.2px">Gérez votre marketing en pilote automatique</h2><p class="muted" style="max-width:520px;margin:6px 0 14px">Autopilot fait la promotion de vos produits sur Facebook, Instagram, TikTok et WhatsApp, et continue d’affiner la stratégie tout en vous laissant le contrôle.</p><div class="row"><button class="btn primary" onclick="go('autopilot')">Démarrer</button><button class="btn tint">En savoir plus</button></div></div><div class="hide-m" style="width:200px;height:110px;border-radius:12px;background:#f3f3f3;display:grid;place-items:center">${spark(series(16,10,6,.8),160,70,'#1a1a1a')}</div></div></div>
 <div class="row" style="margin:24px 0 10px"><h2 style="flex:1">Performance marketing</h2><button class="btn sm">${I('cal','s')}30 derniers jours ${I('chevD','s')}</button><button class="btn plain sm" onclick="go('attribution')">Afficher les détails</button></div>
 <div class="card pad"><div class="strong">Ventes attribuées au marketing</div><div style="margin:2px 0 8px"><span style="font-size:18px;font-weight:650;color:var(--text-strong)">1 284 500 FCFA</span> <span class="muted">sur 6 474 573 FCFA de ventes totales</span></div>${lineChart(series(30,40000,30000,800),null,{h:240,w:1100,labels:['19 oct.','27 oct.','4 nov.','12 nov.','18 nov.'],yfmt:v=>fmt(v/1000)+' k'})}<div class="legend"><span><i style="background:#2a6fdb"></i>19 oct. – 18 nov. 2026</span></div></div>
 <div class="grid g3" style="margin-top:16px"><div class="card pad"><div class="strong">Visites par type de trafic</div><div class="row small muted" style="gap:14px;margin:6px 0"><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1bb6e8"></i> Payant 5 943</span><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2a6fdb"></i> Organique 1 532</span><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7c3aed"></i> Direct 485</span></div><div style="display:flex;height:34px;border-radius:4px;overflow:hidden;margin-top:12px"><div style="flex:74;background:#1bb6e8"></div><div style="flex:19;background:#2a6fdb"></div><div style="flex:7;background:#7c3aed"></div></div></div>
 <div class="card pad"><div class="row"><span style="color:#0866ff">${I('meta','s')}</span><span class="strong" style="flex:1">Facebook</span><span class="muted small">5 612 visites</span></div><div style="font-size:20px;font-weight:650;margin-top:22px;color:var(--text-strong)">842 000 FCFA</div></div>
 <div class="card pad"><div class="row"><span style="color:#25d366">${I('wa','s')}</span><span class="strong" style="flex:1">WhatsApp</span><span class="muted small">1 108 visites</span></div><div style="font-size:20px;font-weight:650;margin-top:22px;color:var(--text-strong)">442 500 FCFA</div></div></div>
 <div class="card pad" style="margin-top:16px"><h2>Autopilot</h2><div class="row" style="margin-top:8px"><span class="muted" style="flex:1">Connectez des canaux pour promouvoir automatiquement vos produits avec des campagnes gérées.</span><button class="btn sm" onclick="go('autopilot')">Démarrer</button></div></div>
 <div class="card pad"><h2>Campagnes récentes</h2><div class="row" style="margin-top:8px"><span class="muted" style="flex:1">Créez des campagnes pour évaluer dans quelle mesure vos initiatives marketing permettent d’atteindre vos objectifs commerciaux.</span><button class="btn sm" onclick="go('campaigns')">Créer une campagne</button></div></div></div>`;
V.attribution=()=>{const rows=[['Meta Ads','Payant',612000,5562,38],['Facebook','Organique',148000,331,9],['Instagram','Payant',94000,376,6],['WhatsApp','Organique',442500,1108,27],['TikTok','Payant',0,304,0],['Google','Organique',38000,176,2],['Direct','Inconnu',0,103,0]];
 return `<div class="page">${header('gauge','Attribution','',`<button class="btn ghost sm">Performance ${I('chevUD','s')}</button>`)}
 <div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="btn sm">${I('cal','s')}30 derniers jours ${I('chevD','s')}</button><button class="btn sm">19 oct. – 18 nov. 2026 ${I('chevD','s')}</button><span style="flex:1"></span><button class="btn sm">Dernier clic non direct ${I('chevUD','s')}</button><button class="btn sm">Trafic marketing ${I('chevUD','s')}</button></div>
 <div class="grid g4">${[['Ventes totales','1 334 500 FCFA'],['Commandes','82'],['Valeur moyenne du panier','16 274 FCFA'],['Visites','7 960']].map(k=>`<div class="card pad kpi"><div class="t dotted" style="display:inline">${k[0]}</div><div class="v" style="font-size:16px">${k[1]}${spark(series(14,10,6,.3),70,22)}</div></div>`).join('')}</div>
 <div class="card" style="margin-top:16px"><div class="row" style="padding:14px 16px"><h2 style="flex:1">Canaux de marketing les plus performants</h2><button class="btn plain sm">Tout afficher</button></div>${table([{h:'Canal de marketing'},{h:'Type de trafic'},{h:'Total des ventes',cls:'num'},{h:'Visites',cls:'num'},{h:'Commandes',cls:'num'},{h:'Conversion',cls:'num'},{h:'Dépenses pub',cls:'num'},{h:'ROAS',cls:'num'},{h:'CPA',cls:'num'}],rows.map(r=>({cells:[`<span class="row">${I(r[0]==='WhatsApp'?'wa':r[0].includes('Meta')||r[0]==='Facebook'||r[0]==='Instagram'?'meta':'globe','s')}${r[0]}</span>`,r[1],F(r[2]),fmt(r[3]),r[4],(r[4]/r[3]*100).toFixed(1).replace('.',',')+' %',r[1]==='Payant'?F(r[3]*22):'—',r[1]==='Payant'&&r[2]?(r[2]/(r[3]*22)).toFixed(1).replace('.',','):'—',r[4]&&r[1]==='Payant'?F(r[3]*22/r[4]):'—']})),{check:false,pager:false})}</div></div>`};
V.autopilot=()=>`<div class="page">${header('gauge','Campaign Autopilot')}
 <div class="grid" style="grid-template-columns:1.6fr 1fr;gap:40px;margin-top:20px;align-items:start"><div>
 <p style="font-size:22px;line-height:31px;font-weight:550;color:var(--text-strong);letter-spacing:-.3px;margin:0 0 28px">Le pilote automatique analyse l’historique de votre <b>catalogue</b>, de votre <b>tarification</b>, de vos <b>marges bénéficiaires</b> et de vos <b>ventes</b> pour identifier les tendances de performance et découvrir des opportunités de croissance pour votre boutique.</p>
 <div class="row" style="margin-bottom:8px"><span class="strong">Actions en attente</span><span class="badge">3</span></div>
 <div class="card">${[['meta','Connecter le canal Meta Ads','Trouvez de nouveaux clients grâce à des campagnes ciblées sur Facebook et Instagram.','#0866ff'],['wa','Connecter WhatsApp Business','Envoyez des campagnes de diffusion et récupérez les paniers abandonnés.','#25d366'],['spark','Connecter TikTok Ads','Faites découvrir vos produits à la communauté TikTok du Cameroun et d’Afrique centrale.','#1a1a1a']].map(a=>`<div class="lrow" style="cursor:default"><span style="color:${a[3]}">${I(a[0])}</span><div style="flex:1"><div class="strong">${a[1]}</div><div class="muted small">${a[2]}</div></div><button class="btn primary sm" onclick="toast('Connexion en cours…')">Connecter</button><button class="mini">${I('x','s')}</button></div>`).join('')}</div>
 <div class="row" style="margin:24px 0 8px">${I('hist','s')}<span class="strong">Activité</span></div><p class="muted small" style="margin:0 0 4px">Aujourd’hui</p>
 <div class="timeline">${['Analyse de vos ventes au cours des 30 derniers jours','Analyse du catalogue et du stock de votre boutique','Le pilote automatique est en cours d’initialisation'].map((t,i)=>`<div class="ev"><i class="${i===2?'g':''}"></i><span style="flex:1">${t}</span><span class="muted small">16:07</span></div>`).join('')}</div></div>
 <div><div class="strong" style="margin-bottom:10px">Configuration</div>
 ${[['globe','Régions','Cameroun'],['lang','Langues','Français, Anglais']].map(c=>`<div class="row" style="padding:7px 0">${I(c[0],'s')}<span style="flex:1">${c[1]}</span><span class="muted">${c[2]}</span></div>`).join('')}
 <div class="row small" style="padding:6px 0 6px 26px">${I('plus','s')} Retour sur les dépenses publicitaires cible</div><div class="row small" style="padding:6px 0 6px 26px">${I('plus','s')} Coût d’acquisition client</div>
 <div class="row" style="padding:7px 0">${I('lock','s')}<span style="flex:1">Autorisations</span><button class="btn sm">Gérer les éléments approuvés ${I('chevUD','s')}</button></div>
 <div class="row" style="padding:14px 0"><span class="strong" style="flex:1">Se connecter à un canal ${I('info','s')}</span>${I('plus','s')}</div></div></div></div>`;
V.campaigns=()=>`<div class="page">${header('gauge','Campagnes',`<button class="btn primary">Créer une campagne</button>`)}<div class="row" style="margin-bottom:12px"><span class="badge">${I('bolt','s')}12 activités non attribuées</span></div><div class="card"><div class="row" style="padding:12px 16px;border-bottom:1px solid var(--border-2)"><span class="strong" style="flex:1">Campagnes</span>${I('sort','s')}</div><div class="row" style="padding:24px;gap:24px"><div style="flex:1"><h3 style="margin:0 0 6px;font-size:14px">Centralisez le suivi de vos campagnes</h3><p class="muted" style="margin:0 0 14px;max-width:560px">Créez des campagnes marketing pour évaluer comment vos initiatives contribuent à vos objectifs commerciaux. Regroupez vos publications Facebook, vos diffusions WhatsApp et vos actions terrain (affiches, radio, marchés).</p><div class="row"><button class="btn primary">Créer une campagne</button><button class="btn tint">En savoir plus</button></div></div><div class="hide-m" style="width:150px">${ILL.campaign}</div></div></div></div>`;
V.discounts=()=>`<div class="page">${header('disc','Réductions',`<button class="btn">${I('exp','s')}Exporter</button><button class="btn primary">Créer une réduction</button>`)}<div class="card">${ixBar(['Toutes','Actives','Programmées','Expirées'])}${table([{h:'Titre'},{h:'Statut'},{h:'Méthode'},{h:'Admissibilité'},{h:'Type'},{h:'Cumuls'},{h:'Utilisations',cls:'num'}],[['TABASKI10','10 % de réduction sur toute la boutique','Actif','Code'],['LIVRAISONDLA','Livraison gratuite à Douala dès 20 000 FCFA','Actif','Automatique'],['WAX2PLUS1','Achetez 2 robes wax, obtenez 1 foulard','Programmé','Code'],['BIENVENUE','2 000 FCFA sur la première commande','Actif','Code'],['BLACKFRIDAY','20 % sur la sélection Black Friday','Expiré','Code']].map((r,i)=>({cells:[`<div><div class="strong">${r[0]}</div><div class="small muted">${r[1]}</div></div>`,badge(r[2],r[2]==='Actif'?'ok':r[2]==='Programmé'?'info':''),r[3],'Tous les clients',r[1].includes('Livraison')?'Livraison gratuite':r[1].includes('obtenez')?'Achetez X obtenez Y':'Montant sur la commande','—',[48,121,0,233,410][i]]})),{pager:false})}</div></div>`;
V.metaobjects=()=>`<div class="page">${header('img','Métaobjets',`<button class="btn">Gérer</button><button class="btn primary">Ajouter une définition</button>`)}
 <div class="grid" style="grid-template-columns:1fr 1fr 1.6fr"><div class="grid"><div class="card pad"><div class="strong">Disponible sur la boutique</div><div class="muted">0 entrée</div></div><div class="card pad"><div class="strong">Actif</div><div class="muted">13 entrées</div></div></div><div class="grid"><div class="card pad"><div class="strong">Pages web</div><div class="muted">0 entrée</div></div><div class="card pad"><div class="strong">Brouillon</div><div class="muted">0 entrée</div></div></div>
 <div class="card pad"><div class="strong" style="margin-bottom:6px">Entrées récentes</div>${['Audience cible','Description de la marque','Valeurs de la marque','Style et esthétique'].map(e=>`<div class="row" style="padding:4px 0"><span style="flex:1">${e}</span><span class="muted">Base de connaissances AXIA</span></div>`).join('')}<div class="strong small" style="margin-top:6px">Afficher les 13 entrées</div></div></div>
 <div class="card" style="margin-top:16px">${ixBar(['Personnalisé'],'Recherche dans les définitions de métaobjet…')}<div class="empty"><h3 style="font-size:20px">Aucune définition trouvée</h3><p>Essayez de modifier les filtres ou le terme de recherche</p></div></div></div>`;
V.files=()=>`<div class="page">${header('img','Fichiers',`<button class="mini">${I('dots','s')}</button><button class="btn">${I('folder','s')}Nouveau dossier</button><button class="btn primary">${I('plus','s')}Fichiers</button>`)}<div class="card">${ixBar(['Tous','Images','Vidéos','Documents'],'Rechercher des fichiers')}${table([{h:''},{h:'Nom du fichier'},{h:'Texte alternatif'},{h:'Date d’ajout ↓'},{h:'Taille',cls:'num'},{h:'Références'}],PRODUCTS.flatMap((p,i)=>[[p,`MN-${String(i+1).padStart(3,'0')}-face.webp`],[p,`MN-${String(i+1).padStart(3,'0')}-detail.jpg`]]).map(([p,f],i)=>({cells:[prodThumb(p,32),f,`<span class="muted">${i%3?'':p.t.split(' ').slice(0,3).join(' ')}</span>`,`le ${6+(i%5)} nov. à ${10+i%9}:${String(i*7%60).padStart(2,'0')}`,(30+i*41%700)+',4 Ko',i%4?'1 produit':'1 thème']})))}</div></div>`;
V.menus=()=>`<div class="page">${header('img','Menus',`<button class="btn">Redirections d’URL</button><button class="btn primary">Créer un menu</button>`)}<div class="card">${ixBar(['Tous'],'Rechercher des menus')}${table([{h:'Menu ↓'},{h:'Éléments de menu'}],[['Menu principal du compte client','Commandes, Profil'],['Menu principal','Accueil, Catalogue, Pagne wax, Bien-être, Contact'],['Menu du pied de page','Rechercher, Livraison, Paiement à la livraison, Contact WhatsApp']].map(r=>({cells:[`<span class="strong">${r[0]}</span>`,r[1]]})),{check:false,pager:false})}</div></div>`;
V.articles=()=>`<div class="page narrow">${header('img','Articles de blog',`<button class="btn">${I('pen','s')}Gérer les blogs</button>`)}${empty(ILL.blog,'Rédiger un article de blog','Les articles de blog sont un excellent moyen de bâtir une communauté autour de vos produits et de votre marque. AXIA peut vous proposer un premier jet.',`<button class="btn">En savoir plus</button><button class="btn primary">Créer un article de blog</button>`)}</div>`;
V.markets=()=>`<div class="page">${header('globe','Marchés',`<button class="btn">${I('pen','s')}Vue graphique</button><button class="btn primary">Créer un marché</button>`)}<div class="card"><div class="ix-bar"><button class="mini">${I('panel','s')}</button><label class="ix-search">${I('search','s')}<input placeholder="Rechercher dans tous les marchés"></label><button class="mini">${I('menu','s')}</button><button class="mini">${I('sort','s')}</button></div>
 ${table([{h:'Marché ↑'},{h:'Statut'},{h:'Conditions'},{h:'Personnalisations'}],[{cells:[`<span class="row">${I('globe','s')}Cameroun</span>`,badge('Actif','ok'),'🇨🇲 Cameroun','FCFA (XAF) · Français, Anglais']},{cells:[`<span class="row">${I('globe','s')}CEMAC</span>`,badge('Brouillon','info'),'Gabon, Congo, Tchad, RCA, Guinée équatoriale','FCFA (XAF)']}],{check:false,pager:false})}
 ${['Créer le marché Afrique de l’Ouest (UEMOA)','Créer le marché Diaspora — France et Belgique'].map(t=>`<div class="row" style="padding:10px 14px;background:#f6f2ff;border-top:1px solid #ece4ff;color:#5b3cc4">${I('spark','s')}<span class="u">${t}</span>${I('plus','s')}<span style="flex:1"></span>${I('x','s')}</div>`).join('')}</div></div>`;
V.catalogs=()=>`<div class="page narrow">${header('globe','Catalogues',`<button class="btn disabled">Exporter</button><button class="btn disabled">Importer</button><button class="btn primary">Créer un catalogue</button>`)}${empty(ILL.catalog,'Personnalisez l’expérience d’achat avec les catalogues','Créez des offres de produits et de tarification sur mesure pour vos clients grossistes, revendeurs ou marchés grâce aux catalogues.',`<button class="btn primary">Créer un catalogue</button>`,'En savoir plus sur les <span class="link">catalogues</span>')}</div>`;
V.rollouts=()=>`<div class="page">${header('globe','Déploiements')}<div class="grid g2" style="margin-top:20px;align-items:center;gap:40px"><div><h2 style="font-size:24px;line-height:32px;font-weight:650;letter-spacing:-.3px">Planifiez et testez des modifications sur votre boutique en ligne</h2><p class="muted" style="margin:10px 0 16px">Préparez des modifications des thèmes, des réductions, des catalogues et du paiement pour vos prochains lancements (Tabaski, Noël, rentrée), événements à durée limitée ou tests A/B. <b class="strong">En savoir plus</b></p><button class="btn primary">${I('plus','s')}Créer un déploiement</button>
 <div style="margin-top:28px">${[['flag','Planifier le lancement de mises à jour sur votre boutique'],['disc','Configurer des événements à durée limitée avec retour automatique à l’état initial'],['bars','Mener une expérimentation auprès d’une audience test pour voir ce qui fonctionne le mieux']].map(r=>`<div class="row" style="padding:10px 0;border-top:1px solid var(--border-2)">${I(r[0],'s')}<span>${r[1]}</span></div>`).join('')}</div></div>
 <div class="card pad hide-m" style="background:#fafafa"><div class="row small muted" style="justify-content:space-between;margin-bottom:12px">${[18,22,26,30,4,8,12,16].map((d,i)=>`<span style="${i===0?'background:#1a1a1a;color:#fff;border-radius:50%;width:20px;height:20px;display:grid;place-items:center':''}">${d}</span>`).join('')}</div>${[['Lancement Tabaski','#fbd5a5',40,60],['Événement','#d9ccff',10,30],['Traitement','#bfe8ff',35,40],['Témoin','#c9f2b5',35,40]].map(b=>`<div style="margin:8px 0 8px ${b[2]}%;width:${b[3]}%;background:${b[1]};border-radius:6px;padding:3px 8px;font-size:12px;font-weight:550">${b[0]}</div>`).join('')}<div class="row" style="margin-top:16px"><span style="background:#1a1a1a;color:#fff;border-radius:8px;padding:4px 10px;font-weight:650;font-variant-numeric:tabular-nums">00 : 12</span><span class="muted small">Déploiement démarré</span></div></div></div></div>`;

V.analytics=()=>{const h=['00 h','06 h','12 h','18 h'];return `<div class="page">${header('bars','Analyses de données',`<button class="mini">${I('dots','s')}</button><button class="btn">Essayer les objectifs ${I('chevD','s')}</button><button class="btn primary">Nouvelle exploration</button>`,`<span class="tag">Actualisation aujourd’hui à 16:09</span>`)}
 <div class="banner" style="margin-bottom:14px">${I('info','s')}<div>À partir du 21 septembre 2026, les visites issues de WhatsApp sont mesurées via des liens suivis, ce qui offre une meilleure visibilité sur l’activité réelle des acheteurs. <span class="u">En savoir plus</span></div></div>
 <div class="row" style="margin-bottom:14px"><button class="btn sm">${I('cal','s')}Aujourd’hui ${I('chevD','s')}</button><button class="btn sm">17 nov. 2026 ${I('chevD','s')}</button><button class="btn sm">FCFA XAF</button></div>
 <div class="card"><div class="grid" style="grid-template-columns:260px 1fr;gap:0"><div style="border-right:1px solid var(--border-2);padding:8px">${['Robe pagne wax « Kribi »','Visites avec ajout au panier','Huile de karité — retours','Ventes de nouveaux clients','Commandes livrées vers Yaoundé'].map((t,i)=>`<div class="row" style="padding:8px;border-radius:8px;${i===0?'background:#f1f1f1':''}">${I(i===0?'up':'info','s')}<span class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</span></div>`).join('')}</div>
 <div style="padding:16px"><div class="small muted">Informations · 18 nov. 2026</div><div class="row" style="align-items:flex-start;gap:20px"><div style="flex:1"><h3 style="margin:4px 0;font-size:15px;color:var(--text-strong)">${I('up','s')} Robe pagne wax « Kribi » — coupe évasée</h3><p class="muted small" style="margin:0 0 10px">Les ventes de ce produit montent en flèche, en hausse de 60 %, passant de 590 000 FCFA la même période le mois dernier à 944 000 FCFA depuis le début du mois.</p><button class="btn sm">Voir pourquoi</button></div><div style="width:45%" class="hide-m">${lineChart(series(30,10,4,.5),null,{h:140,w:420})}</div></div></div></div></div>
 <div class="grid g4" style="margin-top:16px">${[['Ventes brutes','209 800 FCFA','75 %'],['Taux de clients récurrents','14,28 %','14 %'],['Commandes traitées','6',''],['Commandes','14','75 %']].map(k=>`<div class="card pad kpi"><div class="t dotted" style="display:inline">${k[0]}</div><div class="v" style="font-size:16px">${k[1]} ${k[2]?`<span class="delta">↗ ${k[2]}</span>`:''}</div>${spark(series(20,10,6,.3),200,30)}</div>`).join('')}</div>
 <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:16px"><div class="card pad"><div class="t strong">Ventes totales au fil du temps</div><div class="v" style="font-size:20px;font-weight:650;margin:4px 0 8px;color:var(--text-strong)">209 825 FCFA <span class="delta">↗ 75 %</span></div>${lineChart(series(24,9000,8000,300),series(24,6000,5000,100),{h:240,w:720,labels:h,yfmt:v=>fmt(v/1000)+' k'})}<div class="legend"><span><i style="background:#2a6fdb"></i>18 nov. 2026</span><span><i style="background:#9fc3f6"></i>17 nov. 2026</span></div></div>
 <div class="card pad"><div class="strong">Ventilation des ventes totales</div>${[['Ventes brutes','209 825 FCFA'],['Réductions','−8 000 FCFA'],['Retours','0 FCFA'],['Ventes nettes','201 825 FCFA'],['Frais de livraison','21 000 FCFA'],['Taxes','0 FCFA'],['Ventes totales','222 825 FCFA']].map((r,i)=>`<div class="row" style="padding:7px 0;border-bottom:1px solid var(--border-2)"><span class="${i===6?'strong':'link'}" style="flex:1">${r[0]}</span><span class="${i===6?'strong':''}">${r[1]}</span></div>`).join('')}</div></div>
 <div class="grid g3" style="margin-top:16px"><div class="card pad"><div class="strong">Ventes par canal</div><div style="display:grid;place-items:center;margin:14px 0"><svg width="150" height="150" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#e3e3e3" stroke-width="5"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#1bb6e8" stroke-width="5" stroke-dasharray="52 48" stroke-dashoffset="25"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#2a6fdb" stroke-width="5" stroke-dasharray="30 70" stroke-dashoffset="73"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#7c3aed" stroke-width="5" stroke-dasharray="18 82" stroke-dashoffset="43"/><text x="21" y="22" text-anchor="middle" font-size="5" font-weight="700" fill="#1a1a1a">209,8 k</text><text x="21" y="27" text-anchor="middle" font-size="2.8" fill="#8a8a8a">FCFA</text></svg></div><div class="small">${[['#1bb6e8','WhatsApp','52 %'],['#2a6fdb','Boutique en ligne','30 %'],['#7c3aed','Facebook & Instagram','18 %']].map(r=>`<div class="row" style="padding:3px 0"><i style="width:8px;height:8px;border-radius:50%;background:${r[0]}"></i><span style="flex:1">${r[1]}</span><span>${r[2]}</span></div>`).join('')}</div></div>
 <div class="card pad"><div class="strong">Visites au fil du temps</div><div style="font-size:18px;font-weight:650;margin:4px 0;color:var(--text-strong)">179 <span class="delta">↗ 23 %</span></div>${lineChart(series(24,8,6,.1),series(24,6,4),{h:180,w:380,labels:h})}</div>
 <div class="card pad"><div class="strong">Ventes totales par produit</div>${PRODUCTS.slice(0,5).map((p,i)=>`<div style="margin:10px 0"><div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.t}</div><div class="row"><div class="hbar" style="width:${[90,64,52,40,24][i]}%"></div><span class="small muted">${fmt([94,67,55,42,25][i])} k</span></div></div>`).join('')}</div></div>
 <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-top:16px"><div class="card pad"><div class="strong">Analyse de cohorte de clients</div><div class="ix-wrap"><table class="cohort" style="width:100%;border-collapse:separate;border-spacing:2px;margin-top:10px"><tr class="muted"><td style="text-align:left">Cohorte</td>${[0,1,2,3,4,5].map(m=>`<td>Mois ${m}</td>`).join('')}</tr>${['juin 2026','juil. 2026','août 2026','sept. 2026','oct. 2026','nov. 2026'].map((c,r)=>`<tr><td style="text-align:left">${c}</td>${[0,1,2,3,4,5].map(m=>{if(m>5-r)return'<td></td>';const v=m===0?100:Math.max(2,Math.round(22/(m)+rnd()*6));const a=m===0?1:v/30;return `<td style="background:rgba(42,111,219,${Math.min(1,a).toFixed(2)});color:${a>.5?'#fff':'#303030'};border-radius:4px">${v} %</td>`}).join('')}</tr>`).join('')}</table></div></div>
 <div class="card pad"><div class="strong">Visites par page de destination</div>${[['/products/robe-pagne-wax-kribi',102,'46 %'],['/products/huile-karite-bio',76,'3 %'],['/collections/bien-etre',41,'—'],['/products/sac-raphia',18,'12 %'],['Accueil · /',12,'—']].map(r=>`<div class="row" style="padding:7px 0;border-bottom:1px solid var(--border-2)"><span class="small" style="flex:1;word-break:break-all">${r[0]}</span><span class="strong">${r[1]}</span><span class="small delta" style="width:44px;justify-content:flex-end">${r[2]}</span></div>`).join('')}</div></div></div>`};
V.reports=()=>`<div class="page">${header('bars','Rapports',`<button class="btn primary">Nouvelle exploration</button>`)}<div class="card">${ixBar(['Tous','Acquisition','Clients','Ventes','Commandes','Stock'],'Rechercher des rapports')}${table([{h:'Nom'},{h:'Catégorie'},{h:'Dernière consultation ↓'},{h:'Créé par'},{h:''}],[['Temps de chargement mobile (réseau 3G/4G)','Performance','le 17 nov. à 20:26'],['Visites au fil du temps','Acquisition'],['Visites par emplacement','Acquisition'],['Visites par référent','Acquisition'],['Visites par référent de médias sociaux','Acquisition'],['Visites depuis WhatsApp','Acquisition'],['Visiteurs en ce moment','Acquisition'],['Analyse client RFM','Clients'],['Analyse de cohorte de clients','Clients'],['Clients par emplacement','Clients'],['Clients ponctuels','Clients'],['Clients récurrents','Clients'],['Taux de refus à la livraison (COD)','Commandes'],['Délais de livraison par ville','Commandes'],['Ventes par produit','Ventes'],['Ventes par canal','Ventes'],['Ventes par moyen de paiement (MoMo, OM, COD)','Ventes'],['Taux de vente du stock','Stock'],['Stock restant par jours','Stock']].map(r=>({cells:[`<span class="strong">${r[0]}</span>`,r[1],r[2]||'—','AXSO',`<span class="muted">${I('flag','s')}</span>`]})),{check:false})}</div></div>`;
V.live=()=>{const PJ=([lo,la])=>[200+(lo-15)*4.1,205-(la-2)*4.1];
 const POLYS=[[[-17,21],[-16,28],[-10,30],[-6,35.8],[10,37],[11,33],[20,31],[32,31.5],[34,28],[43,12],[51,12],[51,10],[40,-3],[40,-11],[35,-24],[32,-28],[26,-34],[19,-34.8],[17,-29],[12,-17],[13,-5],[9,-1],[9,4],[6,4.3],[-4,5],[-8,4.5],[-13,8],[-17,14.7]],[[43.5,-13],[50,-15.5],[47,-25],[44,-23]],[[35,30],[48,30],[56,25],[59,22],[52,16],[43,12.5],[39,20]],[[-9,37],[-9,43],[-2,44],[-5,48],[2,51],[8,54],[12,55],[25,60],[40,60],[40,42],[28,41],[23,37],[15,38],[10,44],[3,43],[-5,36]]].map(p=>p.map(PJ));
 const inP=(x,y,p)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[xi,yi]=p[i],[xj,yj]=p[j];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c};
 let dots='';for(let y=8;y<392;y+=7)for(let x=8;x<392;x+=7){const dx=x-200,dy=y-200;if(dx*dx+dy*dy<186*186){const land=POLYS.some(p=>inP(x,y,p));const f=1-Math.sqrt(dx*dx+dy*dy)/220;dots+=`<circle cx="${x}" cy="${y}" r="${land?2.1:1.1}" fill="${land?'#4fb8ad':'#cdeee9'}" opacity="${(.5+f*.6).toFixed(2)}"/>`}}
 const [dx0,dy0]=PJ([9.7,4.05]),[yx,yy]=PJ([11.5,3.87]),[bx,by]=PJ([10.4,5.5]);
 return `<div class="page">${header('bars','Vue en direct','',`<span class="tag"><span class="live-dot" style="margin:0 4px 0 0;width:8px;height:8px"></span>À l’instant</span>`)}
 <div class="grid" style="grid-template-columns:380px 1fr;align-items:start"><div class="stack">
 <div class="grid g2">${[['Visiteurs en ce moment','4'],['Ventes totales','209,8 k FCFA'],['Visites','179'],['Commandes','14']].map(k=>`<div class="card pad kpi"><div class="t dotted" style="display:inline">${k[0]}</div><div class="v" style="font-size:16px">${k[1]}</div>${spark(series(14,10,6,.2),140,22)}</div>`).join('')}</div>
 <div class="card pad"><div class="strong">Comportement des clients</div><div class="grid g3" style="margin-top:8px;gap:8px">${[['Paniers actifs','2'],['Au paiement','1'],['Achat effectué','1']].map(k=>`<div><div class="small muted">${k[0]}</div><div class="strong">${k[1]}</div></div>`).join('')}</div><svg viewBox="0 0 300 90" style="width:100%;margin-top:10px"><path d="M0 10h100v80H0z" fill="#2a4fd7"/><path d="M100 10l100 30v50H100z" fill="#7d96f0"/><path d="M200 40l100 25v25H200z" fill="#c6d3fb"/></svg></div>
 <div class="card pad"><div class="strong">Visites par emplacement</div>${[['Douala, Littoral',114,90],['Yaoundé, Centre',41,40],['Bafoussam, Ouest',16,14],['Limbé, Sud-Ouest',8,8]].map(r=>`<div style="margin-top:10px"><div class="small muted">${r[0]}</div><div class="row"><div class="hbar" style="width:${r[2]}%"></div><span class="small">${r[1]}</span></div></div>`).join('')}</div>
 <div class="card pad"><div class="strong">Nouveaux clients et clients récurrents</div><div class="row small muted" style="gap:12px;margin:6px 0"><span>● Nouveau 12</span><span>● Récurrent 2</span></div><div style="display:flex;height:34px;border-radius:4px;overflow:hidden"><div style="flex:12;background:#1bb6e8"></div><div style="flex:2;background:#7c3aed"></div></div></div>
 </div><div class="card" style="position:relative;min-height:600px;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#fff,#f7fbfb)"><div class="row" style="position:absolute;top:12px;right:12px"><div class="search" style="background:#fff;border-color:#e3e3e3;color:#8a8a8a;margin:0;width:220px">${I('search','s')}Rechercher un emplacement</div><button class="mini">${I('eye','s')}</button><button class="mini">${I('fullscreen','s')}</button></div><svg viewBox="0 0 400 400" style="width:min(520px,90%)"><defs><radialGradient id="gl" cx=".4" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6f6f4"/></radialGradient></defs><circle cx="200" cy="200" r="190" fill="url(#gl)"/>${dots}<circle cx="${dx0}" cy="${dy0}" r="6" fill="#7c3aed" stroke="#fff" stroke-width="2"/><circle cx="${yx}" cy="${yy}" r="5" fill="#1bb6e8" stroke="#fff" stroke-width="2"/><circle cx="${bx}" cy="${by}" r="4" fill="#1bb6e8" stroke="#fff" stroke-width="2"/></svg><div class="legend" style="position:absolute;bottom:14px;right:16px"><span><i style="background:#7c3aed"></i>Commandes</span><span><i style="background:#1bb6e8"></i>Visiteurs en ce moment</span></div></div></div></div>`};

V['online-store']=()=>`<div class="page">${header('store','Boutique en ligne',`<button class="btn sm">${I('eye','s')}Public ${I('chevD','s')}</button><button class="btn sm" onclick="window.open('https://axsoafrica.com','_blank')">Afficher la boutique</button><button class="mini">${I('dots','s')}</button>`)}
 <div class="mstrip"><div class="per">${I('cal','s')}30 jours</div><div class="m"><div class="t dotted" style="display:inline">LCP P75</div><div class="v"><span class="strong">2 795 ms</span>${badge('Modéré','att')}</div></div><div class="m"><div class="t dotted" style="display:inline">INP P75</div><div class="v"><span class="strong">312 ms</span>${badge('Modéré','att')}</div></div><div class="m"><div class="t dotted" style="display:inline">Poids moyen de page</div><div class="v"><span class="strong">1,1 Mo</span>${badge('Bon','ok')}</div></div><div class="m hide-m"><div class="t">Visites</div><div class="v strong">7 960</div></div></div>
 <div class="card"><div class="theme-prev" style="margin:12px;box-shadow:none;background:#0A1A33;color:#fff"><div style="text-align:center;font-size:10px;letter-spacing:2px;padding:6px;background:#EBA900;color:#0A1A33;font-weight:700">LIVRAISON 24 H À DOUALA · PAIEMENT À LA LIVRAISON</div><div class="row" style="padding:12px 22px"><span style="font-weight:700;letter-spacing:1px">MAISON NDOLO</span><span style="flex:1"></span><span class="small hide-m" style="opacity:.8;display:flex;gap:18px"><u>Accueil</u><span>Catalogue</span><span>Pagne wax</span><span>Contact</span></span><span style="flex:1"></span>${I('search','s')}${I('user','s')}${I('orders','s')}</div><div style="padding:60px 30px 70px;background:linear-gradient(120deg,#13294d,#0A1A33)"><div class="small" style="letter-spacing:2px;opacity:.7">COLLECTION SAISON SÈCHE</div><div style="font-size:30px;font-weight:650;margin:8px 0 14px;max-width:420px;line-height:36px">L’élégance camerounaise, livrée chez vous</div><span style="display:inline-block;background:#EBA900;color:#0A1A33;padding:8px 16px;border-radius:6px;font-weight:650">Découvrir</span></div></div>
 <div class="row" style="padding:12px 16px;border-top:1px solid var(--border-2)"><div class="thumb" style="width:64px;height:40px;background:#0A1A33"></div><div style="flex:1"><div class="strong">Thème Douala ${badge('Thème actuel','ok')}</div><div class="muted small">Ajouté le 23 juil. à 8:40 · Version 2.4.0</div></div><button class="btn sm">${I('dots','s')}</button><button class="btn primary sm" onclick="go('theme-editor')">Personnaliser</button></div></div>
 <div class="row" style="margin:24px 0 10px"><h2 style="flex:1">Bibliothèque de thèmes</h2><button class="btn sm">Ajouter un thème ${I('chevD','s')}</button></div>
 <div class="card"><div class="row" style="padding:12px 16px"><div class="thumb" style="width:64px;height:40px;background:#f4e4bc"></div><div style="flex:1"><div class="strong">Yaoundé</div><div class="muted small">Ajouté le 2 sept. · Non publié</div></div><button class="btn sm">Publier</button><button class="btn sm">Personnaliser</button></div></div>
 <div class="row" style="margin:24px 0 10px"><h2 style="flex:1">Découvrir des thèmes</h2><button class="btn sm">Visiter la boutique de thèmes</button></div>
 <div class="grid g3">${[['Douala','Mode & textile','#0A1A33','#EBA900'],['Kribi','Bien-être & cosmétique','#f4e4bc','#8d6e3c'],['Sahel','Épicerie & terroir','#2b8a3e','#f1f1f1']].map(t=>`<div class="card"><div style="height:170px;background:${t[2]};padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;align-content:end">${[1,2,3,4,5,6].map(()=>`<div style="height:40px;border-radius:4px;background:${t[3]};opacity:.75"></div>`).join('')}</div><div class="row" style="padding:12px 14px"><div style="flex:1"><div class="strong">${t[0]}</div><div class="muted small">par AXSO · ${t[1]}</div></div><button class="btn sm">Ajouter</button></div></div>`).join('')}</div></div>`;
V.pages=()=>`<div class="page">${header('store','Pages',`<button class="btn primary">Ajouter une page</button>`)}<div class="card">${ixBar(['Toutes'])}${table([{h:'Titre'},{h:'Visibilité'},{h:'Contenu'},{h:'Mise à jour ↓'}],[['Contact','Visible',''],['Livraison et paiement à la livraison','Visible','Nous livrons à Douala en 24 h et à Yaoundé en 48 h…'],['À propos de Maison Ndolo','Visible','Née à Akwa en 2021…'],['Politique de retour','Masquée','']].map(r=>({cells:[`<span class="strong">${r[0]}</span>`,badge(r[1],r[1]==='Visible'?'ok':''),`<span class="muted">${r[2]}</span>`,'le 23 juil. à 8:40']})),{pager:false})}</div></div>`;
V.preferences=()=>`<div class="page thin">${header('store',`<a href="#online-store" class="muted">${I('chevL','s')}</a> Préférences`,`<button class="mini">${I('dots','s')}</button>`)}
 <h2 style="margin:20px 0 10px">Accès à la boutique</h2><div class="card">${[['Mode privé','Affiche une <span class="u">page de destination</span> qui exige un mot de passe pour accéder à votre boutique'],['Restreindre l’accès aux clients B2B uniquement','Les clients B2B devront se connecter et vérifier leur compte pour accéder à votre boutique. <span class="u">Gérer les entreprises</span>']].map(r=>`<div class="lrow" style="cursor:default"><div style="flex:1"><div class="strong">${r[0]} ${I('info','s')}</div><div class="muted small">${r[1]}</div></div><span class="toggle" onclick="this.classList.toggle('on')"></span></div>`).join('')}</div>
 <h2 style="margin:24px 0 10px">Image de partage sur les réseaux sociaux et référencement naturel (SEO) ${I('info','s')}</h2><div class="card pad"><div class="grid" style="grid-template-columns:1fr 1.3fr"><div><div style="height:130px;border-radius:10px;background:#f1f1f1;display:grid;place-items:center;text-align:center" class="small"><div><div class="strong">Ajouter une image</div><div class="muted">Recommandé : 1200 × 628 px</div></div></div><div class="small muted" style="margin-top:8px">${STORE.domain.toUpperCase()}</div><div class="strong">${STORE.name}</div></div><div><label class="field"><span class="row">Titre de la page d’accueil<span style="flex:1"></span><span class="link small">Traduire</span></span><input value="Maison Ndolo — Mode et bien-être made in Cameroun"></label><label class="field"><span class="row">Méta-description<span style="flex:1"></span><span class="link small">Traduire</span></span><textarea placeholder="Saisissez une description à afficher sur les moteurs de recherche comme Google"></textarea></label></div></div></div>
 <h2 style="margin:24px 0 10px">Suivi et pixels</h2><div class="card">${[['Meta Pixel','Connecté via Facebook & Instagram','ok'],['TikTok Pixel','Non connecté',''],['Google Analytics','Non connecté','']].map(r=>`<div class="lrow"><div style="flex:1"><div class="strong">${r[0]}</div><div class="muted small">${r[1]}</div></div>${badge(r[2]?'Actif':'Inactif',r[2])}${I('chevR','s chev')}</div>`).join('')}</div></div>`;
V.agentic=()=>`<div class="page">${header('spark','Agentique',`<button class="mini">${I('dots','s')}</button>`)}<div class="grid" style="grid-template-columns:1.6fr 1fr;gap:40px;margin-top:16px;align-items:start"><div><h2 style="font-size:22px;line-height:30px;font-weight:600;letter-spacing:-.3px">Votre boutique est presque prête pour le commerce agentique : les agents IA peuvent déjà afficher vos produits</h2><div class="strong" style="margin:28px 0 8px">Préparez-vous pour les vitrines agentiques</div><div class="card">${[['Assurez-vous que l’accès au catalogue est activé','Autorisez les agents d’IA (ChatGPT, Copilot, Gemini, AXIA) à rechercher vos produits'],['Vos politiques sont à jour','Les politiques de livraison et de retour sont conformes aux exigences des agents']].map(r=>`<div class="lrow" style="cursor:default"><span style="color:#29845a">${I('check','s')}</span><div style="flex:1"><div class="strong">${r[0]}</div><div class="muted small">${r[1]}</div></div><span class="badge hide-m" style="font-family:monospace">/pages/livraison</span></div>`).join('')}</div><p class="muted small" style="margin-top:14px">En vendant sur ces canaux de vente, vous acceptez les <span class="u">Conditions supplémentaires</span> des vitrines agentiques AXSO.</p></div>
 <div><div class="strong">Canaux</div><div class="row" style="padding:8px 0"><span style="flex:1">Autoriser AXSO à gérer pour moi</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div>${['ChatGPT','Microsoft Copilot','Google Gemini','AXIA (assistant d’achat AXSO)','Autres canaux'].map(c=>`<div class="row small" style="padding:5px 0 5px 12px">${I('check','s')}${c}</div>`).join('')}<div class="strong" style="margin-top:18px">Sources</div><div class="row small" style="padding:6px 0"><span style="flex:1">Base de connaissances</span><span class="muted">6 sur 13 publiés</span></div><div class="row small" style="padding:6px 0"><span style="flex:1">Catalogue AXSO</span>${badge('Admissible','ok')}</div></div></div></div>`;
V.whatsapp=()=>`<div class="page narrow">${header('wa','WhatsApp Business',`<button class="mini">${I('dots','s')}</button>`)}<div class="row" style="gap:16px;border-bottom:1px solid var(--border-2);margin-bottom:16px"><span style="padding:8px 2px;border-bottom:2px solid #1a1a1a;font-weight:600">Aperçu</span><span class="muted" style="padding:8px 2px">Messages</span><span class="muted" style="padding:8px 2px">Diffusions</span><span class="muted" style="padding:8px 2px">Paramètres</span></div>
 <div class="grid" style="grid-template-columns:2fr 1fr;align-items:start"><div class="stack"><div class="card pad"><h2>Prochaines étapes pour votre catalogue</h2><div style="text-align:center;padding:24px 0"><div style="width:56px;height:56px;border-radius:50%;background:#d9fdd3;margin:0 auto 12px;display:grid;place-items:center;color:#128c4a">${I('check')}</div><div class="strong" style="font-size:15px">Vous êtes à jour pour le moment.</div></div></div>
 <div class="card pad"><div class="row"><h2>Commandes depuis WhatsApp</h2>${badge('Actif','ok')}</div><p class="muted" style="margin:6px 0 10px">Les clients parcourent votre catalogue dans WhatsApp et valident leur panier. La commande arrive dans AXSO avec le numéro du client, prête à être confirmée.</p><span class="link">Envoyer une diffusion ${I('ext','s')}</span></div></div>
 <div class="card pad"><h2>Statut du catalogue</h2><div class="row" style="margin:10px 0">${badge('Approuvé','ok')}<span>8 produits</span></div><div class="link small">Voir les produits synchronisés</div><div class="small" style="margin-top:8px">Numéro associé : <b>+237 6 99 00 00 00</b></div></div></div></div>`;
V.social=()=>`<div class="page narrow">${header('meta','Facebook & Instagram',`<button class="btn plain sm">Obtenir de l’aide</button><button class="btn plain sm" onclick="openFbModal()">Associer un compte Facebook</button><button class="mini">${I('dots','s')}</button>`)}<div class="row" style="gap:16px;border-bottom:1px solid var(--border-2);margin-bottom:16px"><span style="padding:8px 2px;border-bottom:2px solid #1a1a1a;font-weight:600">Aperçu</span><span class="muted" style="padding:8px 2px">Paramètres</span></div>
 <div class="grid" style="grid-template-columns:2fr 1fr;align-items:start"><div class="stack"><div class="card pad"><h2>Prochaines étapes pour votre catalogue</h2><div style="text-align:center;padding:24px 0"><div style="width:56px;height:56px;border-radius:50%;background:#e7f0ff;margin:0 auto 12px;display:grid;place-items:center;color:#0866ff">${I('check')}</div><div class="strong" style="font-size:15px">Vous êtes à jour pour le moment.</div></div></div>
 <div class="card pad"><div class="row"><h2>Diffuser des publicités sur Facebook et Instagram</h2>${badge('Actif','ok')}</div><p class="muted" style="margin:6px 0 10px">Créez des campagnes publicitaires pour faire découvrir vos produits à des millions d’utilisateurs Facebook ou Instagram susceptibles d’être convertis en clients.</p><span class="link">Créer une publicité ${I('ext','s')}</span></div></div>
 <div class="card pad"><h2>Statut du produit</h2><div class="row" style="margin:10px 0">${badge('Approuvé','ok')}<span>8 produits</span></div><div class="link small">Voir les produits synchronisés</div><div class="row small" style="margin-top:8px">Catalogue de produits associé ${I('chevD','s')}</div></div></div></div>`;
V.cod=()=>`<div class="page">${header('receipt','Formulaire COD',`<button class="mini">${I('dots','s')}</button>`)}<div class="grid g4">${[['Commandes COD (30 j)','352'],['Taux de confirmation','81 %'],['Refus à la livraison','7,4 %'],['Montant à encaisser','3,1 M FCFA']].map(k=>`<div class="card pad kpi"><div class="t">${k[0]}</div><div class="v">${k[1]}</div></div>`).join('')}</div>
 <div class="card pad" style="margin-top:16px"><h2>Formulaire de commande</h2><p class="muted" style="margin:4px 0 12px">Formulaire en une étape affiché sur vos pages produits : nom, téléphone, quartier, ville. Confirmation automatique par WhatsApp.</p><div class="grid g2"><div class="card pad" style="background:#fafafa">${['Nom complet','Téléphone (+237)','Ville','Quartier / point de repère'].map(f=>`<label class="field"><span class="small">${f}</span><input disabled></label>`).join('')}<button class="btn primary" style="width:100%;justify-content:center">Commander — paiement à la livraison</button></div><div>${[['Confirmation WhatsApp automatique',true],['Vérification du numéro par OTP',true],['Bloquer les numéros à refus répétés',true],['Proposer le paiement MoMo avant expédition',false]].map(t=>`<div class="lrow" style="cursor:default;padding-left:0"><span style="flex:1">${t[0]}</span><span class="toggle ${t[1]?'on':''}" onclick="this.classList.toggle('on')"></span></div>`).join('')}</div></div></div></div>`;
V['cod-fraud']=()=>`<div class="page narrow">${header('receipt','Prévention de la fraude')}<div class="card">${table([{h:'Numéro'},{h:'Commandes'},{h:'Refus'},{h:'Statut'}],[['+237 6 77 •• •• 12',5,4,'Bloqué','crit'],['+237 6 90 •• •• 48',3,2,'À surveiller','warn'],['+237 6 55 •• •• 03',2,1,'À surveiller','warn']].map(r=>({cells:[r[0],r[1],r[2],badge(r[3],r[4])]})),{check:false,pager:false})}</div></div>`;
V['cod-plans']=()=>`<div class="page">${header('receipt','Plans de facturation')}<div class="grid g3">${[['Gratuit','0 FCFA','60 commandes/mois'],['Pro','9 900 FCFA','/ mois · commandes illimitées'],['Business','24 900 FCFA','/ mois · multi-boutiques']].map((p,i)=>`<div class="card pad" style="${i===1?'box-shadow:0 0 0 2px #1a1a1a':''}"><div class="strong">${p[0]}</div><div style="font-size:22px;font-weight:650;margin:8px 0 2px;color:var(--text-strong)">${p[1]}</div><div class="muted small">${p[2]}</div><div class="divider"></div>${['Formulaire COD','Confirmation WhatsApp','Prévention de la fraude','Analyses avancées'].slice(0,2+i).map(f=>`<div class="row small" style="padding:3px 0">${I('check','s')}${f}</div>`).join('')}<button class="btn ${i===1?'primary':''}" style="width:100%;justify-content:center;margin-top:14px">${i===0?'Forfait actuel':'Choisir'}</button></div>`).join('')}</div></div>`;
V['theme-editor']=()=>{location.hash='online-store';toast('Éditeur de thème — à venir dans la prochaine itération');return V['online-store']()};

/* -------- Settings views -------- */
const S={};
S['p-general']=()=>`<div class="set-h"><span class="store-av" style="width:28px;height:28px;font-size:12px">MN</span>${STORE.name}<span style="flex:1"></span><span class="badge" style="font-weight:500">Santé du vendeur : Évaluation en cours</span></div>
 <div class="card"><div class="row" style="padding:12px 16px;border-bottom:1px solid var(--border-2)">${I('lock','s')}<span class="strong">Débloquez une bonne santé du vendeur pour vendre sur les <span class="u">canaux agentiques et autres</span></span></div>${['Ajouter les informations sur l’entreprise (RCCM, NIU)','Traiter votre première commande'].map(t=>`<div class="lrow"><span class="cbx" style="border-radius:50%"></span><span>${t}</span>${I('chevR','s chev')}</div>`).join('')}</div>
 <div class="set-sec"><h3>Informations sur l’entreprise</h3><p>Entité commerciale utilisée pour les produits financiers, les marchés, les applications et les taxes dans cette boutique</p></div><div class="card"><div class="lrow"><span style="font-size:18px">🇨🇲</span><div><div class="strong">Maison Ndolo SARL</div><div class="muted small">Cameroun · RCCM RC/DLA/2021/B/1234</div></div><span class="chev">${I('dots','s')}</span></div></div>
 <div class="set-sec"><h3>Coordonnées de la boutique</h3></div><div class="card"><div class="lrow">${I('store','s')}<div><div class="strong">${STORE.name}</div><div class="muted small">${STORE.email} · +237 6 99 00 00 00</div></div>${I('chevR','s chev')}</div><div class="lrow">${I('pin','s')}<div><div class="strong">Adresse de la boutique</div><div class="muted small">Rue Joss, ${STORE.city}, Cameroun</div></div>${I('chevR','s chev')}</div></div>
 <div class="set-sec"><h3>Paramètres par défaut de la boutique</h3></div><div class="card">${[['money','Devise de la boutique','Franc CFA (XAF FCFA)'],['globe','Unités de mesure','Système métrique · kilogramme (kg)'],['cal','Fuseau horaire','(GMT+01:00) Afrique/Douala'],['receipt','Préfixe des commandes','#MN']].map(r=>`<div class="lrow">${I(r[0],'s')}<div><div class="strong">${r[1]}</div><div class="muted small">${r[2]}</div></div>${I('chevR','s chev')}</div>`).join('')}</div>`;
S['p-plan']=()=>`<div class="set-h">Forfait</div><div class="card pad"><div class="row"><div style="flex:1"><div class="muted small">Forfait actuel</div><div style="font-size:18px;font-weight:650;color:var(--text-strong)">AXSO Croissance</div><div class="muted">15 000 FCFA / mois · prochaine facture le 1er déc. 2026</div></div><button class="btn">Changer de forfait</button></div></div>
 <div class="grid g3" style="margin-top:16px">${[['Démarrage','5 000 FCFA','1 utilisateur · 2 % par transaction'],['Croissance','15 000 FCFA','5 utilisateurs · 1 % · AXIA inclus'],['Pro','35 000 FCFA','15 utilisateurs · 0,5 % · B2B']].map((p,i)=>`<div class="card pad" style="${i===1?'box-shadow:0 0 0 2px #1a1a1a':''}"><div class="strong">${p[0]}</div><div style="font-size:20px;font-weight:650;margin:6px 0;color:var(--text-strong)">${p[1]}<span class="muted small" style="font-weight:400"> /mois</span></div><div class="muted small">${p[2]}</div></div>`).join('')}</div>`;
S['p-payments']=()=>`<div class="set-h">Paiements</div><div class="banner" style="margin-bottom:16px">${I('info','s')}<div>Les commandes payées par Mobile Money sont confirmées instantanément et réduisent les refus à la livraison.</div></div>
 <div class="set-sec"><h3>Fournisseurs de paiement</h3><p>Moyens de paiement proposés à vos clients au moment du paiement</p></div><div class="card">${[['#ffcc00','MTN','MTN Mobile Money','Frais : 1,5 % · versement J+1','Actif','ok'],['#ff7900','OM','Orange Money','Frais : 1,5 % · versement J+1','Actif','ok'],['#1a1a1a','COD','Paiement à la livraison','Encaissement par le livreur ou en point relais','Actif','ok'],['#1a4fd7','CB','Cartes bancaires (Visa, Mastercard)','Via AXSO Payments · 2,9 %','Non configuré',''],['#00a8e8','W','Wave','Disponible prochainement au Cameroun','Bientôt','info']].map(r=>`<div class="lrow"><span style="width:36px;height:24px;border-radius:5px;background:${r[0]};color:${r[0]==='#ffcc00'?'#1a1a1a':'#fff'};font-size:9px;font-weight:800;display:grid;place-items:center">${r[1]}</span><div style="flex:1"><div class="strong">${r[2]}</div><div class="muted small">${r[3]}</div></div>${badge(r[4],r[5])}${I('chevR','s chev')}</div>`).join('')}</div>
 <div class="set-sec"><h3>Capture des paiements</h3></div><div class="card pad"><div class="row"><span style="flex:1">Capturer automatiquement le paiement à la commande</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div></div>`;
S['p-shipping']=()=>`<div class="set-h">Expédition et livraison</div><div class="set-sec"><h3>Expédition</h3></div>
 <div class="card"><div class="row" style="padding:12px 16px"><div style="flex:1"><div class="strong">Profils d’expédition</div><div class="muted small">Gérer les destinations d’expédition et les tarifs pour les produits ${I('info','s')}</div></div><span class="muted small">1 profil ${I('chevD','s')}</span></div>
 <div style="padding:0 12px 12px"><div class="banner" style="margin-bottom:10px">${I('info','s')}<div style="flex:1"><b>Nouveau : tarifs par quartier à Douala et Yaoundé.</b> Définissez un prix différent pour Akwa, Bonamoussadi, Bastos… <span class="u">En savoir plus</span></div><button class="btn sm">Configurer</button></div>
 <div class="card" style="box-shadow:0 0 0 1px #e3e3e3"><div style="padding:10px 14px" class="strong">Par défaut de la boutique</div><div class="lrow"><span style="flex:1">Profil général</span><span class="small row hide-m">${I('tag','s')}Tous les produits</span><span class="small row hide-m">${I('pin','s')}1 emplacement</span><span class="small row">${I('globe','s')}4 zones</span>${I('chevR','s chev')}</div></div>
 <div class="row small" style="padding:10px 4px 0">${I('plus','s')}Ajouter un profil personnalisé</div></div></div>
 <div class="card" style="margin-top:16px">${[['Zones et tarifs','Douala 1 500 FCFA · Yaoundé 2 500 FCFA · Autres villes 3 500 FCFA · CEMAC 12 000 FCFA','4 zones'],['Délais de livraison estimés','Indiquez aux clients quand ils peuvent s’attendre à recevoir leurs commandes','Activé'],['Partenaires de livraison','Livreurs indépendants, agences de voyage (Buca, Général Express), points relais','3 connectés'],['Emballages','Définir les dimensions des colis pour le calcul des tarifs','1 boîte']].map(r=>`<div class="lrow"><div style="flex:1"><div class="strong">${r[0]}</div><div class="muted small">${r[1]}</div></div><span class="muted small">${r[2]} ${I('chevD','s')}</span></div>`).join('')}</div>
 <div class="set-sec"><h3>Livraison locale et retrait</h3></div><div class="card">${[['Livraison locale','Entrepôt Akwa, Douala','Activée','ok'],['Retrait en magasin','Boutique Rue Joss, Akwa','Activé','ok'],['Points relais','12 points relais à Douala et Yaoundé','Désactivé','']].map(r=>`<div class="lrow"><div style="flex:1"><div class="strong">${r[0]}</div><div class="muted small">${r[1]}</div></div>${badge(r[2],r[3])}${I('chevR','s chev')}</div>`).join('')}</div>`;
S['p-taxes']=()=>`<div class="set-h">Taxes et frais de douane<span style="flex:1"></span><button class="btn sm">Rapports</button></div><div class="row"><h3 style="flex:1;margin:0;font-size:13px">Service fiscal</h3><button class="btn sm tint">Gérer</button></div><div class="card" style="margin-top:8px"><div class="lrow" style="cursor:default"><span class="store-av" style="background:#0A1A33;color:#EBA900">%</span><div><div class="strong">AXSO Tax</div><div class="muted small">Calcule automatiquement la TVA camerounaise (19,25 %) lors du paiement</div></div></div></div>
 <div class="set-sec"><h3>Régions fiscales ${I('info','s')}</h3><p>Où vous percevez et versez les taxes de vos clients. Créez une <span class="u">zone d’expédition</span> pour ajouter une nouvelle région fiscale.</p></div>
 <div class="card">${ixBar(['Toutes'],'Rechercher')}${table([{h:'Région'},{h:'Perception'}],[['🇨🇲','Cameroun','TVA 19,25 %'],['🇬🇦','Gabon','—'],['🇨🇬','Congo','—'],['🇹🇩','Tchad','—'],['🇨🇫','République centrafricaine','—'],['🇬🇶','Guinée équatoriale','—'],['🇳🇬','Nigeria','—'],['🇫🇷','France','—']].map(r=>({cells:[`<span class="row"><span style="font-size:16px">${r[0]}</span>${r[1]}</span>`,r[2]==='—'?'<span class="muted">—</span>':badge(r[2])]})),{check:false,pager:false})}</div>`;
S['p-users']=()=>`<div class="set-h">Utilisateurs<span style="flex:1"></span><button class="btn primary sm">Ajouter des utilisateurs</button></div><div class="card">${[['AK','Arthur K.','Propriétaire de la boutique','#2c6ecb'],['MK','Max K.','Administrateur','#29845a'],['YN','Yannick N.','Personnel · Commandes, Produits','#8051ff'],['LV','Livreur Akwa','Personnel · Commandes (lecture)','#e2a44a']].map(u=>`<div class="lrow"><span class="av" style="background:${u[3]}">${u[0]}</span><div style="flex:1"><div class="strong">${u[1]}</div><div class="muted small">${u[2]}</div></div>${I('chevR','s chev')}</div>`).join('')}</div>`;
S['p-domains']=()=>`<div class="set-h">Domaines<span style="flex:1"></span><button class="btn sm">Connecter un domaine existant</button><button class="btn primary sm">Acheter un domaine</button></div><div class="card">${table([{h:'Nom de domaine'},{h:'Statut'},{h:'Fournisseur'}],[[STORE.domain,'Principal','ok','AXSO'],['maisonndolo.cm','Disponible à l’achat','info','—']].map(r=>({cells:[`<span class="strong">${r[0]}</span>`,badge(r[1],r[2]),r[3]]})),{check:false,pager:false})}</div>`;
S['p-checkout']=()=>`<div class="set-h">Paiement (checkout)</div><div class="card">${[['Parcours en une page','Nom, téléphone, quartier, moyen de paiement — sur un seul écran',true],['Téléphone obligatoire','Format +237 vérifié automatiquement',true],['Compte client facultatif','Les clients peuvent commander sans créer de compte',true],['Pourboire au livreur','Proposer un pourboire facultatif',false]].map(r=>`<div class="lrow" style="cursor:default"><div style="flex:1"><div class="strong">${r[0]}</div><div class="muted small">${r[1]}</div></div><span class="toggle ${r[2]?'on':''}" onclick="this.classList.toggle('on')"></span></div>`).join('')}</div>`;
function genericSet(r){const s=SET.find(x=>x[0]===r);return `<div class="set-h">${s?s[2]:'Paramètres'}</div><div class="card">${['Configuration générale','Préférences avancées','Historique des modifications'].map(t=>`<div class="lrow"><div style="flex:1"><div class="strong">${t}</div><div class="muted small">Gérer les options ${s?s[2].toLowerCase():''} de ${STORE.name}</div></div>${I('chevR','s chev')}</div>`).join('')}</div>`}

/* ===================== Modals, AXIA, command palette ===================== */
function openModal(html,cls=''){const m=document.getElementById('modal');m.className='modal '+cls;m.innerHTML=html;document.getElementById('scrim').classList.add('open')}
function closeModal(){document.getElementById('scrim').classList.remove('open')}
function openApps(){openModal(`<div class="cmdk"><div class="si">${I('search','s')}<span class="badge">Applis ${I('x','s')}</span><input placeholder="Rechercher" autofocus><button class="mini">${I('menu','s')}</button></div><div class="res"><div class="grp">Applis installées (3)</div>${[['receipt','Formulaire COD','#1a1a1a','cod'],['wa','Messagerie WhatsApp','#25d366','whatsapp'],['lang','Traduction FR / EN','#2c6ecb','p-languages']].map(a=>`<a onclick="closeModal();go('${a[3]}')"><span class="thumb" style="width:26px;height:26px;color:${a[2]}">${I(a[0],'s')}</span>${a[1]}</a>`).join('')}<div class="grp">Sélectionnées pour vous</div>${[['truck','Livraison express Douala','Assignez les commandes aux livreurs en un clic','4,8'],['money','Rapprochement MoMo','Associez automatiquement les paiements MoMo aux commandes','4,9'],['star','Avis clients avec photos','Collectez des avis via WhatsApp après livraison','4,7'],['bars','Pixel TikTok & Meta','Suivez vos conversions publicitaires','4,6']].map(a=>`<a><span class="thumb" style="width:36px;height:36px">${I(a[0],'s')}</span><div style="flex:1"><div class="strong">${a[1]}</div><div class="small muted">${a[3]} ★ · Conçue pour AXSO · ${a[2]}</div></div>${I('imp','s')}</a>`).join('')}</div><div class="row small muted" style="padding:10px 14px;border-top:1px solid var(--border-2)">${I('grid','s')}Toutes les applis recommandées<span style="width:12px"></span>${I('gear','s')}<a href="#p-apps" onclick="closeModal()">Paramètres des applis</a></div></div>`,'cmdk')}
function openChannels(){openModal(`<div class="mh">Ajouter un canal de vente<span style="flex:1"></span><button class="mini" onclick="closeModal()">${I('x','s')}</button></div><div class="mb">${[['wa','WhatsApp Business','Installé'],['meta','Facebook & Instagram','Installé'],['spark','TikTok Shop','Ajouter'],['store','Point de vente (boutique physique)','Ajouter'],['globe','Jumia Marketplace','Ajouter']].map(c=>`<div class="lrow" style="padding:12px 0">${I(c[0])}<span class="strong" style="flex:1">${c[1]}</span><button class="btn sm ${c[2]==='Installé'?'disabled':''}">${c[2]}</button></div>`).join('')}</div>`)}
function openFbModal(){openModal(`<div style="height:150px;background:#fbe4e4;display:grid;place-items:center;position:relative"><button class="mini" style="position:absolute;top:10px;right:10px;background:#fff" onclick="closeModal()">${I('x','s')}</button><span style="color:#0866ff;transform:scale(2.6)">${I('meta')}</span></div><div class="mb"><h2 style="font-size:20px;line-height:27px;font-weight:650">Associez le compte Facebook que vous utilisez pour votre entreprise</h2><p class="muted">Bénéficiez de recommandations personnalisées pour vos campagnes publicitaires et restez connecté(e) pour une expérience de configuration plus fluide.</p><div class="row strong" style="margin-top:12px">${I('lock','s')}Confidentialité du compte</div><p class="muted small" style="margin:4px 0 0 28px">Votre compte associé sera utilisé pour vérifier que vous avez l’autorisation d’accéder aux comptes et éléments professionnels. Vous pouvez le dissocier à tout moment.</p></div><div class="mf" style="justify-content:flex-start"><button class="btn primary" onclick="closeModal();toast('Compte Facebook associé')">Associer le compte</button><button class="btn plain" onclick="closeModal()">Annuler</button></div>`)}
const ROUTE_TITLES=[...NAV,...CHANNELS_NAV,...APPS_NAV].flatMap(g=>[[g.id,g.t,g.ic],...(g.sub||[]).map(s=>[s[0],s[1],g.ic])]);
function openCmdk(){openModal(`<div class="cmdk"><div class="si">${I('search','s')}<input id="cmdq" placeholder="Rechercher des pages, commandes, produits, clients…" oninput="cmdFilter(this.value)"><span class="badge">Échap</span></div><div class="res" id="cmdres"></div></div>`,'cmdk');cmdFilter('');setTimeout(()=>document.getElementById('cmdq').focus(),20)}
function cmdFilter(q){q=q.toLowerCase();const pages=ROUTE_TITLES.filter(r=>r[1].toLowerCase().includes(q)).slice(0,6);const prods=PRODUCTS.map((p,i)=>[i,p]).filter(([i,p])=>q&&p.t.toLowerCase().includes(q)).slice(0,4);const ords=ORDERS.filter(o=>q&&(('#'+o.n).includes(q)||o.cust.toLowerCase().includes(q))).slice(0,4);
 document.getElementById('cmdres').innerHTML=`${pages.length?'<div class="grp">Pages</div>':''}${pages.map(r=>`<a onclick="closeModal();go('${r[0]}')">${I(r[2],'s')}${r[1]}</a>`).join('')}${prods.length?'<div class="grp">Produits</div>':''}${prods.map(([i,p])=>`<a onclick="closeModal();go('product-${i}')">${prodThumb(p,24)}${p.t}</a>`).join('')}${ords.length?'<div class="grp">Commandes</div>':''}${ords.map(o=>`<a onclick="closeModal();go('order-${o.n}')">${I('orders','s')}#${o.n} · ${o.cust}<span style="flex:1"></span>${F(o.total)}</a>`).join('')}`}
function openAxia(q){const d=document.getElementById('drawer');if(!d.innerHTML)d.innerHTML=`<div class="dh"><span class="axia-av">${AXIA_SVG}</span>AXIA<span class="badge" style="font-weight:500">Démo</span><span style="flex:1"></span><button class="mini" onclick="document.getElementById('drawer').classList.remove('open')">${I('x','s')}</button></div><div class="msgs" id="msgs"><div class="msg ai">Bonjour Arthur. Je peux analyser vos ventes, rédiger des fiches produits, relancer des paniers ou préparer une diffusion WhatsApp. Que voulez-vous faire ?</div></div><div class="in"><textarea id="axin" placeholder="Demandez à AXIA…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();axiaSend(this.value);this.value=''}"></textarea></div>`;d.classList.add('open');if(q&&q.trim())axiaSend(q);else setTimeout(()=>document.getElementById('axin').focus(),200)}
function axiaSend(q){if(!q.trim())return;const m=document.getElementById('msgs');m.insertAdjacentHTML('beforeend',`<div class="msg me">${q.replace(/</g,'&lt;')}</div><div class="msg ai subdued">AXIA analyse…</div>`);m.scrollTop=1e9;setTimeout(()=>{const l=q.toLowerCase();let a;
 if(l.includes('description'))a=`Voici une proposition :<br><br><b>Taillée dans un wax 100 % coton imprimé à la cire</b>, cette pièce allie confort et élégance pour vos cérémonies comme pour le quotidien. Confectionnée à Douala par nos couturières partenaires.<br><br>Voulez-vous que je l’applique à la fiche ?`;
 else if(l.includes('relanc')||l.includes('panier'))a=`6 paniers abandonnés cette semaine pour <b>128 250 FCFA</b>.<ul><li>4 clients ont un numéro WhatsApp vérifié</li><li>Le produit le plus abandonné : Sac cabas en raphia</li></ul>Je peux envoyer une relance avec le code <b>BIENVENUE</b> (2 000 FCFA).`;
 else a=`Sur les 7 derniers jours :<ul><li>Ventes : <b>1,48 M FCFA</b> (+12 %)</li><li>Meilleur produit : Robe pagne wax « Kribi »</li><li>Les <b>Sandales cuir</b> seront en rupture dans ~6 jours</li><li>Taux de refus COD : 7,4 % (Yaoundé : 11 %)</li></ul>Recommandation : réapprovisionner les sandales et proposer MoMo aux clients de Yaoundé avant expédition.`;
 m.lastElementChild.outerHTML=`<div class="msg ai">${a}</div>`;m.scrollTop=1e9},700)}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2200)}

/* ===================== Router ===================== */
function mtop(){return `<div class="mobile-top"><button class="mb" onclick="document.getElementById('app').classList.add('navopen')" aria-label="Menu">${I('menu')}</button><div class="msearch" onclick="openCmdk()">${I('search','s')}Rechercher</div><button class="mb" onclick="openAxia()" aria-label="AXIA"><span class="axia-av">${AXIA_SVG}</span></button><button class="mb" aria-label="Notifications" style="position:relative">${I('bell')}<b style="position:absolute;top:4px;right:4px;background:#e51c00;color:#fff;font-size:9px;line-height:13px;border-radius:7px;padding:0 4px">3</b></button><a class="mb" href="#p-general"><span class="store-av">MN</span></a></div>`}
function moreMenu(btn){const ph=btn.closest('.ph');const items=[...ph.querySelectorAll('.btn:not(.primary)')].map(b=>b.textContent.trim()).filter(Boolean);openModal(`<div class="mh">Actions<span style="flex:1"></span><button class="mini" onclick="closeModal()">${I('x','s')}</button></div><div class="res" style="padding:6px">${items.map(t=>`<a class="lrow" style="border:0;border-radius:8px" onclick="closeModal();toast('${t.replace(/'/g,"’")}')">${t}</a>`).join('')||'<p class="muted" style="padding:10px">Aucune autre action</p>'}</div>`)}
function go(r){location.hash=r}
function render(){
 let r=(location.hash||'#home').slice(1)||'home';
 const app=document.getElementById('app'),main=document.getElementById('main');app.classList.remove('navopen');
 const isSet=r.startsWith('p-');app.classList.toggle('settings',isSet);
 let html;
 if(isSet){renderSnav(r);html=mtop()+`<div class="page thin">${(S[r]||(()=>genericSet(r)))()}</div>`}
 else{let key=r,arg;if(r.startsWith('order-')){key='order';arg=r.slice(6)}else if(r.startsWith('product-')){key='product';arg=r.slice(8)}
  if(!V[key]){key='home';r='home'}renderNav(key==='order'?'orders':key==='product'?'products':r);html=mtop()+V[key](arg)}
 main.innerHTML=html;main.scrollTop=0;
 const t=(ROUTE_TITLES.find(x=>x[0]===r)||SET.find(x=>x[0]===r)&&[0,SET.find(x=>x[0]===r)[2]]||[0,'Accueil'])[1];document.title=`${STORE.name} · ${t} · AXSO`;
 document.getElementById('dock').style.display=r==='home'?'none':'flex';
}
document.getElementById('dockav').innerHTML=AXIA_SVG;
const db=document.querySelectorAll('#dock .mini');db[0].innerHTML=I('plus','s');db[1].innerHTML=I('mic','s');db[2].innerHTML=I('wave','s');db[3].innerHTML=I('panel','s');
window.addEventListener('hashchange',render);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmdk()}if(e.key==='Escape'){closeModal();document.getElementById('drawer').classList.remove('open')}});
render();
</script>
</body>
</html>
````

*Fin de l'annexe A — fin du masterprompt.*
