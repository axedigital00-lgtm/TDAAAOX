
# Composants de l'admin marchand refondu

Recette visuelle : `/dashboard/recette-ui` (hors production). Les composants lisent les jetons de `.adm` (`app/globals.css`) : à rendre sous un ancêtre `.adm`. Icônes : `@/components/ui/icones` (`Icon name="…"`, 16 px dans le contenu).

## Lot 3 — composants de base

Import : `@/components/ui/adm` (D26). Tests : `tests/adm-composants.test.ts`. Les textes passés en props sont **déjà traduits** (`t()`). Les libellés internes (« Fermer », « Retour », « Plus d'actions », « Actions », « Modifications non enregistrées », « Ignorer », « Enregistrer », textes de la confirmation de sortie) passent par `useT()`, anglais dans `lib/i18n/en/dashboard.json`.

| Composant | Fichier | Client | API |
|---|---|---|---|
| `Button` | `Button.tsx` | non | `variant: default·primary·plain·ghost·tint·critical`, `size: md(30 px)·sm(26 px)`, `icon`, `iconPosition`, `disclosure`, `loading` (spinner, largeur conservée, `aria-busy`), `disabled` (opacité .45), `fullWidth`, `href` (rend un `Link`), + attributs `<button>` |
| `IconButton` | `Button.tsx` | non | 28×28, `icon`, `aria-label` **obligatoire** (aussi infobulle native), `href`, `loading` |
| `buttonClasses()` / `Spinner` | `Button.tsx` | non | style bouton sur un autre élément ; indicateur 16 px |
| `Badge` | `Badge.tsx` | non | `tone: success·attention·warning·critical·info·neutral`, `progress: none·incomplete·partial·complete`, `size: md·sm` |
| `badgeCommande(statut)` / `badgePaiement(statut, methode?)` | `statuts.ts` | non | statuts **réels** Axso → `{ label, tone, progress }` (D3, D22) ; libellés de `commandes/statuts.ts`, à passer à `t()`. Paiement en attente + méthode COD → « Paiement à la livraison » |
| `Card` | `Card.tsx` | non | `title`, `actions`, `padding: md·none`. Carte après carte : 16 px, sauf enfant direct d'une `.grid`/`.flex` |
| `CardSection` / `Divider` / `KeyValue` | `Card.tsx` | non | sections séparées de 1 px (carte `padding="none"`) ; séparateur à −16 px ; lignes libellé/valeur (`strong` pour un total) |
| `SettingsRow` / `ResourceList` | `SettingsRow.tsx` | non | `icon`, `title`, `subtitle`, `end` (valeur, badge, toggle), `href` ou `onClick` (survol + chevron) ; `ResourceList` = carte qui empile les lignes |
| `Field` | `Form.tsx` | oui | `label`, `helpText`, `error`, `labelHidden`, `children({ id, aria-describedby, aria-invalid })` pour un contrôle maison |
| `TextField` / `Textarea` / `Select` | `Form.tsx` | oui | props de `Field` + attributs natifs ; `Select` prend `options` |
| `Checkbox` / `Radio` / `Toggle` | `Form.tsx` | oui | `Checkbox indeterminate` (`aria-checked="mixed"`) ; `Toggle checked onChange label` (`role="switch"`, libellé masqué par défaut) |
| `ContextualSaveBar` | `ContextualSaveBar.tsx` | oui | `dirty`, `onSave`, `onDiscard`, `saving`, `message`. Si `dirty` : barre noire collante, `beforeunload`, confirmation avant tout lien interne (le clic est rejoué après « Quitter la page ») |
| `Banner` | `Banner.tsx` | non | `tone: info·warning·critical·success`, `title`, `action { content, href \| onAction }`, `onDismiss` + `dismissLabel` |
| `Modal` | `Overlays.tsx` | oui | `<dialog>` natif : `open`, `onClose`, `title`, `footer`, `size: sm(440)·md(620)·lg(840)`, `locked`. Échap, voile, ✕ ; focus piégé et rendu ; en mobile, en bas d'écran |
| `BottomSheet` | `Overlays.tsx` | oui | `open`, `onClose`, `title` ; poignée : glisser de 80 px vers le bas pour fermer |
| `Popover` / `Menu` / `Action` | `Popover.tsx` | oui | `Popover activator open onClose align` (clic extérieur, Échap) ; `Menu items onItem label` (↑ ↓ Début Fin) ; `Action { content, onAction, href, icon, destructive, disabled }` |
| `Tooltip` | `Popover.tsx` | oui | `content` ; 300 ms au survol ou au focus |
| `PageHeader` | `PageHeader.tsx` | oui | `icon`, `title`, `backHref`, `titleMeta`, `primaryAction` (+ `loading`), `secondaryActions`, `overflowActions` (menu « Plus d'actions ») ; ≤ 820 px : `⋯` → `BottomSheet` |
| `admToast(message, action?)` | `toast.ts` | oui | toast noir, 2,2 s (5 s avec une action « Annuler »), sur `sonner` |
| `Timeline` | `Divers.tsx` | non | `items [{ id, content, time }]` (le premier = le plus récent, point vert), `header` (champ commentaire) |
| `Avatar` / `Thumbnail` | `Divers.tsx` | non | `Avatar name src size` (initiales, couleur stable par hash) ; `Thumbnail src alt size: 24·32·40·72` |
| `Tabs` | `Divers.tsx` | non | `tabs [{ id, label, href? }]`, `selected`, `onSelect` ; liens → `aria-current`, boutons → `role="tab"` |
| `SkeletonText` / `SkeletonCard` / `SkeletonTable` / `SkeletonPage` | `Divers.tsx` | non | shimmer 1,2 s (`@keyframes adm-shimmer`) ; `SkeletonPage label` = `role="status"` |

Écarts : la position du toast vient du `<Toaster>` global (centrage à 76 px du bas à poser par l'AppShell, lot 5) ; `ContextualSaveBar` n'intercepte pas le bouton « Précédent » du navigateur ; le mapping métier ne couvre que commandes et paiements (produits, réductions, paniers : au lot de leur écran).

## Graphiques et illustrations

Import : `@/components/ui/graphiques` et `@/components/ui/illustrations`. SVG maison (pas de recharts), jetons `--chart-*` de `.adm`. Démo : `/dashboard/recette-ui`. Tests : `tests/adm-graphiques.test.ts`. Les libellés sont passés déjà traduits (`t()`), aucun texte fixe dans les composants.

| Composant | Props | Notes |
|---|---|---|
| `Sparkline` | `data: number[]`, `width=64`, `height=22`, `color?` | Décorative (`aria-hidden`) : la valeur s'écrit à côté. Rien si moins de 2 points. |
| `LineChart` *(client)* | `serie`, `comparaison?`, `libelles` (un par point), `ariaLabel`, `legende?: {serie, comparaison?}`, `hauteur=180`, `area?`, `format?: 'compact'\|'montant'\|'nombre'\|'pourcent'`, `devise?` | Largeur mesurée (ResizeObserver), viewBox = largeur réelle : texte jamais déformé. 3 lignes de grille (0, ½, max arrondi), axe Y compact « 14 k », 5 libellés X max. Infobulle au survol et au clavier (← →, Échap) : date, valeur exacte, variation vs comparaison. Tableau `sr-only` des valeurs. |
| `DonutChart` | `segments: {libelle, valeur, couleur?}[]`, `devise?`, `ariaLabel`, `taille=150` | r 15,9 / viewBox 42, épaisseur 5, total compact au centre + « FCFA » (XAF/XOF), légende avec %. |
| `HorizontalBar` | `lignes: {libelle, valeur}[]`, `format?`, `devise?` | Barre 18 px rayon 3 cyan, proportionnelle au max. |
| `StackedBar` | `segments`, `ariaLabel`, `format?`, `devise?` | Barre 34 px multi-segments + légende au-dessus. |
| `FunnelChart` | `etapes: {libelle, valeur}[]`, `ariaLabel` | Un trapèze par étape (`--chart-funnel-1..3`), % de la première étape. |
| `CohortHeatmap` | `titreLignes`, `colonnes`, `lignes: {libelle, valeurs: (number\|null)[]}[]`, `alphaMax=30` | `<table>` natif ; α = valeur / alphaMax (colonne 0 pleine), texte blanc si α > 0,5 ; `null` = période pas encore écoulée. |

Fonctions pures (`echelle.ts`) : `formatCompact`, `formatValeur` (montant via `formatMontant` de `lib/utils`), `pasRond`, `graduations`, `indicesLibelles`, `trace`, `variation`, `arcs`.

**Illustrations** (aplats §4.3, `aria-hidden`, `className` pour la mise en page) :
- États vides 200×150 : `IllustrationBrouillons`, `IllustrationBonsDeCommande`, `IllustrationTransferts`, `IllustrationCampagnes`, `IllustrationCommandes`, `IllustrationProduits`, `IllustrationClients`, `IllustrationFichiers`, `IllustrationReductions`, `IllustrationGenerique`.
- Vignettes du fil 280×140 (`slice`, remplissent leur conteneur) : `VignetteConversion`, `VignetteDomaine` (prop `domaine` : le vrai nom proposé), `VignetteLivraison`, `VignetteWhatsApp`, `VignetteApplications`, `VignetteCartons`.

Écarts : pas de `DotGlobe` (vue en direct avec globe écartée, PLAN §3.1) ; pas d'illustration Mobile Money (D3), cartes-cadeaux, B2B, blog, catalogues (D5 : écrans absents) — à ajouter le jour où l'écran existe.

## Lot 4 — listes et indicateurs

Import : `@/components/ui/adm`. Tests : `tests/adm-index.test.ts`. Démo : `demo-index.tsx` de la recette (filtres, tri, vues et recherche agissent vraiment sur l'URL). Composants purs : la page charge les données à partir des paramètres d'URL et les passe en props.

| Composant | Fichier | API |
|---|---|---|
| `IndexFilters` *(client)* | `IndexFilters.tsx` | `views [{id,label}]` (1re = défaut, `?vue=`), `viewActions?` (menu ⇅ de la vue active, seulement si la page enregistre des vues), `filters [{key,label,options}]` (`?<key>=`, pastilles « Libellé : valeur ✕ » + « Ajouter un filtre »), `sortOptions` (`?tri=colonne:asc\|desc`), `columns` + `hiddenColumns` + `onHiddenColumnsChange`, `searchPlaceholder`. Recherche `?q=` avec debounce 250 ms. Tout changement remet `page`/`curseur` à zéro. À rendre sous `<Suspense>` (utilise `useSearchParams`) |
| `useColonnesMasquees(cle, parDefaut?)` | `IndexFilters.tsx` | `[masquees, setMasquees]`, mémorisé dans `localStorage` (`adm-colonnes:<cle>`), sans erreur si le stockage est bloqué |
| `IndexTable<T>` *(client)* | `IndexTable.tsx` | `rows`, `columns: Column<T>[]` (`id, header, cell, align, numeric, width, sortable, hideOnMobile, mobilePrimary`), `getId`, `label` (nom accessible), `onRowClick` (ligne entière + Entrée ; les éléments interactifs d'une cellule ne déclenchent pas la ligne), `selectable`, `selected`/`onSelectionChange` (contrôlé ou interne), `promotedBulkActions`, `bulkActions` (menu ⋯), `hiddenColumns`, `sort` (« Date ↓ », `aria-sort`) + `onSort`, `loading` (8 lignes squelette), `emptyState`, `pagination {hasPrevious, hasNext, label, onPrevious, onNext}` |
| `MetricsStrip` *(client)* | `MetricsStrip.tsx` | `period`, `periods?` + `onPeriodChange` (menu de période), `metrics [{id, label, definition?, value (formatée), delta? (%), sparkline?}]`. `delta` absent ou null → aucune variation affichée |
| `formatDelta(n)` | `MetricsStrip.tsx` | `{ texte: "↗ 75 %", hausse }` ou null |
| `EmptyState` *(client)* | `EmptyState.tsx` | `title`, `children` (texte), `image` (illustration 200×150), `actions` (secondaire puis primaire), `learnMore {topic, href}` → « En savoir plus sur les {topic} » |
| Règles pures | `index-regles.ts` | `etatSelection`, `basculer`, `basculerTout`, `lireTri`, `ecrireTri`, `trier` (vides en bas, comparaison française numérique), `majRecherche(qs, patch)` |

Mobile (≤ 820 px, §13.4) : plus d'en-têtes ni de cases ; chaque ligne devient un bloc (colonne `mobilePrimary` en gras sur toute la largeur, le reste en `flex-wrap` gris), `hideOnMobile` masquées ; appui long (500 ms) = sélection, puis un appui court bascule une ligne ; barre d'actions groupées fixée en bas. Barre de filtres et vues défilantes sans barre visible.

Écarts : menu des vues (Renommer/Dupliquer/Supprimer) affiché seulement si la page fournit `viewActions` (aucune vue enregistrée n'existe côté back-end) ; période « Personnalisé » à fournir par la page dans `periods` si elle gère une plage de dates ; au-dessous de 1040 px l'infobulle de définition d'une métrique peut être rognée par le défilement horizontal.
