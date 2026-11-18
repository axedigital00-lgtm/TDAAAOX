# PLAN — refonte de l'admin marchand AXSO (phase 1 : audit)

Référence visuelle : `reference/axso-admin-prototype.html` (étape 0 faite et vérifiée : 147 308 octets, `<!DOCTYPE html>` … `</html>`, 0 erreur console).
Arbitrages : `DECISIONS.md` (D1–D22). Ce plan applique les décisions « Retenue » et attend le feu vert sur les « À valider » (D5, D7, D9, D14).

---

## 1. Stack détectée

| Sujet | Constat |
|---|---|
| Framework | Next.js **16.3.8** (App Router, Turbopack), React 19.2.4, TypeScript 5 |
| Rendu | RSC par défaut : les pages `page.tsx` sont des composants serveur qui lisent Prisma directement ; l'interactivité est dans des composants client voisins |
| Middleware | `proxy.ts` (remplace `middleware.ts` dans cette version) |
| Auth / droits | next-auth v5 (JWT) ; `lib/permissions*.ts` (modules × niveaux), paliers via `lib/abonnement.ts` / `planActif` |
| Données | Prisma 7 + PostgreSQL (Neon en prod, local en dev) ; routes `app/api/**` pour les mutations côté client |
| État client | zustand (ponctuel), état local React ; pas de cache de requêtes (pas de SWR/React Query) |
| CSS | Tailwind 4 (`@tailwindcss/postcss`), jetons `--ax-*` et classes `ax-*` dans `app/globals.css` (lot 2 du 18/11) |
| Kit UI | `components/ui` (Bouton, BoutonIcone, Badge, Saisie/ZoneTexte/Champ, EnTetePage, EtatVide/EtatErreur/Squelette, Alerte, Modale/Confirmation, MenusDeroulants…) |
| Icônes | lucide-react (168 fichiers dashboard) |
| Graphiques | recharts (5 fichiers) |
| Toasts | sonner |
| Formulaires | react-hook-form + zod |
| Police | Poppins (next/font + lien Google Fonts) |
| i18n | texte français = clé (`t("…")`), dictionnaires `lib/i18n/en/{admin,boutique,commun,dashboard}.json` |
| Tests | `node --test` via tsx (`tests/*.test.ts`, ~57 fichiers, tests de règles pures) + `tests/integration` (8, base réelle). Playwright installé (binaire présent) mais aucun test e2e. Pas de Storybook |
| Lint / CI | `.github/workflows/ci.yml` : tsc et eslint non bloquants (`|| true`), build, `npm test` bloquants |

## 2. Inventaire des routes marchandes existantes

111 `page.tsx` sous `app/(dashboard)/dashboard`. Layout unique `app/(dashboard)/layout.tsx` → `DashboardShell` (Sidebar 757 l., Header, MobileBottomNav, AxiaPanneau, RechercheDashboard Ctrl+K). Permissions par `moduleKey` sur chaque entrée de menu ; paliers par `requiresPalier`.

| Zone | Routes (préfixe `/dashboard`) | Données |
|---|---|---|
| Accueil | `demarrer` (Accueil B4), `accueil` (Tableau de bord B7), `/` (redirige) | Prisma tenant, commandes, analytics, clients |
| Commandes | `commandes`, `commandes/[id]`, `factures`*, `retours`*, `logistique` (+ `encaissements`, `entrepots`, `transporteurs`, `livreurs`*, `livraison`*, `retours`*), `livreurs`*, `transporteurs`*, `livraison`* | Prisma commande, livreur, facture, RMA ; `/api/entrepots`, `/api/transporteurs` |
| Produits | `produits`, `produits/nouveau`, `produits/[id]`, `produits/[id]/apprenants`, `produits/categories`, `produits/digital` (+ `nouveau`), `produits/creer/{fichier,formation,licence,bundle}`, `produits/imports-ia`, `produits/studio(/[id])`, `produits/live/*`, `entrepots`*, `magic-import` | Prisma produit ; `/api/produits`, `/api/produits/digitaux`, `/api/categories`, `/api/ai/description` |
| Sourcing | `sourcing`, `sourcing/fournisseurs(/[id], /devis)`, `sourcing/reglages` | Prisma fournisseurs ; `/api/produits` |
| Clients | `clients`, `avis`, `whatsapp`, `messages` | Prisma client, avis ; `/api/messages/whatsapp`, `/api/connecteurs/whatsapp*` |
| Marketing | `marketing`, `marketing/{codes-promo,email,tracking}`, `campagnes`, `sms`, `publicite`, `scheduler`, `affiliation`, `automation`, `chatbot`, `feeds` | `/api/codes-promo`, `/api/email`, `/api/sms`, `/api/campagnes`, `/api/affiliation/*`, `/api/automation` |
| Analyses | `analytics`, `rapports`, `objectifs`, `revenus` (+ `commissions`), `veille`, `gamification` | Prisma analytics, commande, commission ; `/api/objectifs` |
| Boutique en ligne | `boutique` (899 l.), `boutique/politiques`, `builder`, `themes`, `themes/creer`, `fichiers`, `medias`, `connecteurs`* | `/api/boutiques`, `/api/politiques`, `/api/themes`, `/api/fichiers`, `/api/medias` |
| IA | `axia/journal`, `agents`, `controle-ia`, `studio` | `/api/ai/*`, `/api/controle-ia/*` |
| Caisse (POS) | `pos` + 26 sous-pages (`caisse`, `session`, `stock`, `inventaire`, `transferts`, `achats`, `receptions`, `promotions`, `fidelite`, `credit`, `comptabilite`, `charges`, `reglages`…) | API et kit dédiés (`components/pos`) |
| Argent | `wallet`, `paiements`* | `/api/wallet`, `/api/wallet/retrait`, `/api/wallet/paiements` |
| Compte | `parametres` (+ `domaine`, `equipe`, `notifications`), `profil`, `abonnement`, `support` | `/api/domaine`, `/api/equipe`, `/api/compte`, `/api/abonnement/changer`, `/api/signalements` |

\* page de 4 à 9 lignes = redirection ou enveloppe vers une autre page.

## 3. Mapping vers l'arborescence cible

Préfixe `/dashboard` et chemins français (D1, D2). Légende statut : **existe** (restyler), **fusion**, **à créer** (sur données existantes), **chantier** (besoin back-end, hors menu tant que absent — D5 b), **écarté** (D5 c).

### 3.1 Menu principal

| Cible (§6) | Route Axso cible | Source actuelle | Statut | API |
|---|---|---|---|---|
| Accueil | `/dashboard` | `demarrer` + `accueil` | **fusion** (D7, à valider) | Prisma direct, `/api/demarrage` |
| Commandes | `/dashboard/commandes` | `commandes` | existe | Prisma commande |
| › fiche | `/dashboard/commandes/[id]` | `commandes/[id]` | existe | idem + livreur |
| › Brouillons | `/dashboard/commandes/brouillons` | — | chantier (pas de modèle commande provisoire ; la création manuelle existe-t-elle ? à vérifier lot 7) | — |
| › Paniers abandonnés | `/dashboard/commandes/paniers` | relances `panier_abandonne` (automation) + `StockReservation` | à créer si les paniers sont identifiables, sinon chantier | `/api/automation` |
| › Livraison et livreurs *(Axso)* | `/dashboard/commandes/livraison` | `logistique/*`, `livreurs`, `transporteurs` | fusion | `/api/entrepots`, `/api/transporteurs` |
| › Retours *(Axso)* | `/dashboard/commandes/retours` | `retours`, `logistique/retours` | fusion | Prisma RMA |
| › Factures *(Axso)* | `/dashboard/commandes/factures` | `factures` | existe | Prisma facture |
| Produits | `/dashboard/produits` | `produits` (+ digital : vue filtrée « Numériques ») | existe + fusion | `/api/produits` |
| › fiche / nouveau | `/dashboard/produits/[id]`, `/nouveau`, `creer/*` | idem | existe (barre d'enregistrement à ajouter) | idem |
| › Collections | `/dashboard/produits/collections` | `produits/categories` (+ modèle `Collection`) | existe (renommage à trancher : Catégories ≠ Collections, voir §5) | `/api/categories` |
| › Stock | `/dashboard/produits/stock` | `entrepots`, `pos/stock` | fusion | `/api/entrepots` |
| › Bons de commande | `/dashboard/produits/bons-de-commande` | `pos/achats` (`BonCommande`), sourcing devis | fusion | API POS |
| › Transferts | `/dashboard/produits/transferts` | `pos/transferts` (`TransfertStock`) | fusion | API POS |
| › Sourcing *(Axso)* | `/dashboard/produits/sourcing` | `sourcing/*` | existe (déplacé) | `/api/produits` |
| › Cartes-cadeaux | — | — | chantier | — |
| Clients | `/dashboard/clients` | `clients` | existe | Prisma client |
| › fiche client | `/dashboard/clients/[id]` | — | à créer (données Client + commandes existent) | Prisma |
| › Segments | `/dashboard/clients/segments` | segments fixes des campagnes (tous / vip / inactifs) | à créer en lecture | Prisma |
| › Avis *(Axso)* | `/dashboard/clients/avis` | `avis` | existe (déplacé) | Prisma avis |
| › Entreprises (B2B) | — | — | écarté | — |
| Croissance | `/dashboard/croissance` | `marketing` | existe (restylé en vue d'ensemble) | `/api/campagnes`… |
| › Campagnes | `/dashboard/croissance/campagnes` | `campagnes`, `marketing/email`, `sms`, `publicite`, `scheduler` | fusion (onglets par type) | existantes |
| › Affiliation *(Axso)* | `/dashboard/croissance/affiliation` | `affiliation` | existe | `/api/affiliation/*` |
| › Automatisations *(Axso)* | `/dashboard/croissance/automatisations` | `automation`, `chatbot` | fusion | `/api/automation`, `/api/chatbot` |
| › Attribution | — | `marketing/tracking` (pixels) partiel | chantier | — |
| › Autopilot | — | `agents`, `controle-ia` (comportement voisin) | à trancher (§5) | — |
| Réductions | `/dashboard/reductions` | `marketing/codes-promo`, `pos/promotions` | fusion | `/api/codes-promo` |
| Contenu | `/dashboard/contenu/fichiers` | `fichiers`, `medias` | fusion | `/api/fichiers`, `/api/medias` |
| › Métaobjets, Menus, Blog | — | menus gérés dans le constructeur | écarté (menus restent dans le constructeur) | — |
| Marchés / Catalogues / Déploiements | — | — | écarté (multi-devise par boutique déjà géré) | — |
| Analyses de données | `/dashboard/analyses` | `analytics` + blocs de `accueil` (D7) | existe + fusion | Prisma |
| › Rapports | `/dashboard/analyses/rapports` | `rapports`, `revenus`, `objectifs` | fusion | Prisma |
| › Vue en direct | `/dashboard/analyses/direct` | `components/live` ? (à vérifier) | à créer en version liste, sans globe (pas de géoloc temps réel) | — |
| **Canaux de vente** | | | | |
| Boutique en ligne | `/dashboard/boutique` | `boutique` | existe (restylé : thème actuel + bibliothèque) | `/api/boutiques` |
| › Thèmes / éditeur | `/dashboard/boutique/themes`, `/dashboard/builder` | `themes`, `builder` | existe | `/api/themes` |
| › Pages / politiques | `/dashboard/boutique/politiques` | idem | existe | `/api/politiques` |
| › Préférences | `/dashboard/boutique/preferences` | `marketing/tracking` (pixels), SEO de `boutique` | fusion | `/api/tenants/moi-complet` |
| › Flux produits *(Axso)* | `/dashboard/boutique/flux` | `feeds` | existe | `/api/tenants/moi` |
| Point de vente *(Axso)* | `/dashboard/pos/*` | `pos/*` | existe (garde son kit, entrée menu seulement) | API POS |
| Agentique | — | — | écarté pour l'instant | — |
| WhatsApp Business | `/dashboard/whatsapp` (`?onglet=apercu|messages|diffusions|parametres`) | `whatsapp`, `messages` | fusion | `/api/messages/whatsapp*` |
| Facebook & Instagram | `/dashboard/reseaux` | `connecteurs`, `scheduler` | fusion partielle | `/api/posts` |
| **Applications** | | | | |
| IA *(Axso)* : Agents, Contrôle IA, Studio, Veille, Journal AXIA | `/dashboard/applis/{agents,controle-ia,studio,veille,journal}` | pages existantes | existe (rangées comme applis installées) | `/api/ai/*` |
| Formulaire COD | — | mode d'achat + champs de commande existent (`ChampsCommandeManager`) | à trancher (§5) | — |
| **Pied de barre** | | | | |
| Mon argent *(Axso)* | `/dashboard/wallet` | `wallet`, `revenus` | existe | `/api/wallet*` |
| Paramètres | `/dashboard/parametres/*` (SettingsShell) | `parametres`, `profil`, `abonnement`, `boutique?section=…` | fusion | existantes |

### 3.2 Paramètres (19 sections cibles)

| Section | Source Axso | Statut |
|---|---|---|
| Général | `boutique` (coordonnées, devise, pays) + `profil` | fusion |
| Forfait | `abonnement` (vrais paliers, D15) | existe |
| Facturation | historique d'abonnement si disponible | à vérifier |
| Utilisateurs | `parametres/equipe` | existe |
| Paiements | réglages paiement de `boutique` ; MoMo/OM/Wave « Bientôt disponible » (D3) | fusion |
| Paiement (checkout) | mode d'achat + champs de commande | fusion |
| Comptes clients | `CompteAcheteur` (réglages s'ils existent) | à vérifier |
| Expédition et livraison | `boutique?section=livraison` (`/api/livraison/regles`) | existe |
| Taxes | — | écarté (D16 : rien n'est calculé) |
| Emplacements | entrepôts + magasins POS | fusion |
| Applications | intégrations (`connecteurs`) | fusion |
| Canaux de vente | liste des canaux ci-dessus | à créer (liens) |
| Domaines | `parametres/domaine` | existe |
| Événements clients | pixels (`marketing/tracking`) | fusion |
| Notifications | `parametres/notifications` | existe |
| Champs méta | — | écarté |
| Langues | langue de l'admin + de la vitrine | fusion |
| Confidentialité | — | écarté sauf bannière cookies si elle existe |
| Politiques | `boutique/politiques` | lien (la page reste sous Boutique en ligne) |

Les anciennes URL restent valides par redirection (`next.config.ts` → `redirects`) : liens d'e-mails, push, WhatsApp, `lib/axia/pages.ts`, `lib/recherche-dashboard.ts` mis à jour dans le même commit que chaque déplacement.

## 4. Inventaire des composants UI

| Composant | Usages (fichiers) | Décision |
|---|---|---|
| `Bouton` / `BoutonIcone` / `classesBouton` | 124 / 33 | réutiliser et restyler → variantes `default, primary, plain, ghost, tint, critical` (mapping : primaire→primary, secondaire→default, fantome→ghost, danger-plein→critical, sombre→primary) |
| `Badge` | 104 | restyler ; tons alignés sur §7.2 + prop `progress` |
| `Saisie` / `ZoneTexte` / `Champ` / `CLASSE_SAISIE` | 57 / — / 50 | restyler (32 px, bordure `#8a8a8a`, focus noir) |
| `EnTetePage` | 49 | **remplacer** par `PageHeader` (sticky, 56 px, actions à droite, menu « ⋯ » mobile) ; `EnTetePage` devient un alias le temps de la migration |
| `EtatVide` / `EtatErreur` / `EtatChargement` / `Squelette*` | 97 | restyler (`EmptyState` du §7.7, illustration optionnelle) |
| `Alerte` | 17 | restyler en `Banner` |
| `Modale` / `Confirmation` / `useConfirmation` | 29 / 7 | réutiliser (déjà `<dialog>` natif, focus piégé, bas d'écran en mobile) ; visuel §7.12 |
| `MenusDeroulants`, `SelectPays`, `ImageUpload`, `MediaUpload`, `LangueSelecteur` | 3–5 | restyler |
| `Sidebar`, `Header`, `MobileBottomNav`, `DashboardShell` | shell | **remplacer** par `AppShell` + `Sidebar` + `MobileTopBar` (la barre du bas mobile disparaît : la cible utilise le tiroir) |
| `RechercheDashboard` (Ctrl+K) | 1 | réutiliser la logique (`lib/recherche-dashboard.ts`), refaire la vue en `CommandPalette` |
| `AxiaPanneau` / `AxiaConversation` | shell | réutiliser (D12) ; ajouter `AxiaDock` |
| `SalesChart` (recharts) + 4 autres | 5 | remplacer progressivement par les SVG maison du §7.8 ; recharts retiré à la fin si plus aucun usage |
| Tableaux maison (listes commandes, produits, clients…) | ~40 pages | **remplacer** par `IndexTable` + `IndexFilters` |
| Kit POS (`components/pos/ui`) | POS | hors périmètre visuel (garde son kit) |

À créer : `IndexTable`, `IndexFilters`, `MetricsStrip`, `Sparkline`/`LineChart`/`Donut`/`HorizontalBar`/`StackedBar`, `SettingsRow`, `Toggle`, `Checkbox`, `Popover`/`Menu`, `Tooltip`, `Tabs`, `Timeline`, `KeyValue`, `Thumbnail`, `Avatar`, `ContextualSaveBar`, `BottomSheet`, `Icon` (voir §8).

## 5. Écarts fonctionnels (D5 — à valider)

**(a) Existe dans Axso, replacé** : commandes, fiche commande, produits et fiches (physiques, numériques, formations, licences, bundles), catégories/collections, stock et entrepôts, bons de commande et transferts (POS), fournisseurs, clients, avis, codes promo, campagnes e-mail/SMS/WhatsApp, affiliation, automatisations, analyses, rapports, objectifs, revenus, fichiers et médias, boutique/thèmes/constructeur/politiques, flux produits, WhatsApp, domaine, équipe, notifications, abonnement.

**(b) Utile au marché, demande du back-end → chantier séparé, absent du menu** :
1. Commandes provisoires (prise de commande par téléphone/WhatsApp avec facture) — très utile au marché.
2. Paniers abandonnés en liste (si l'actuel ne trace pas le panier avec le client).
3. Fiche client enrichie : taux de refus COD par client (donnée calculable depuis les commandes → peut passer en (a)).
4. Risque de commande (score) : à partir de l'historique de refus — calculable, à décider.
5. Cartes-cadeaux.
6. Attribution marketing par canal (UTM/liens suivis).
7. Vue en direct temps réel (visiteurs actifs).

**(c) Écartés** : Entreprises B2B, Marchés, Catalogues, Déploiements, Métaobjets, Menus (restent dans le constructeur), Blog, Agentique, Taxes automatiques, Champs méta.

**À trancher par vous** :
- *Autopilot* : le présenter comme l'écran d'accueil d'« Agents / Contrôle IA » (existant) ou l'écarter ?
- *Formulaire COD* : en faire une « application » qui regroupe mode d'achat, champs de commande, confirmation WhatsApp et blocage des numéros à refus (ce dernier = back-end) ?
- *Catégories vs Collections* : Axso a les deux modèles ; on affiche « Collections » (cible) ou on garde « Catégories » ?

**Inverse (Axso a, la cible non)** : tout est conservé et rangé (D6, tableau §3).

## 6. Risques et mitigation

| Risque | Mitigation |
|---|---|
| **243 fichiers modifiés non commités** (lots 1–4 du 17–18/11) sous la refonte | commiter ces lots **avant** le lot 2 de la refonte, sinon impossible de relire ou d'annuler proprement |
| Liens cassés (e-mails, push, Axia, recherche) | redirections `next.config.ts` + mise à jour de `lib/axia/pages.ts` et `lib/recherche-dashboard.ts` dans le même commit ; test qui vérifie que chaque route référencée existe |
| Régression des permissions / paliers | la nouvelle Sidebar réutilise `groupesVisibles`, `filtreParPermission`, `requiresPalier` tels quels ; test unitaire sur la liste visible par rôle |
| Ampleur (111 pages) | `admin_v2` par cookie/réglage pour basculer écran par écran ; ancien code supprimé seulement quand l'équivalent est livré |
| Perf : shell client plus lourd | shell en composant serveur + îlots client (Sidebar, palette, dock) ; budget 200 Ko vérifié au build |
| CSS : cache Turbopack qui sert un vieux CSS (piège du 18/11) | vider `.next/dev/cache` avant chaque recette visuelle |
| i18n : nouvelles chaînes sans anglais | test « chaînes sans traduction » (D17) |
| Tutoiement → vouvoiement (D11) | fait écran par écran, pas de remplacement global |
| Pas d'e2e aujourd'hui | Playwright (déjà installé) ajouté au lot 5 pour les parcours §19 ; compte de test local existant |
| Données réelles absentes (KPI, insights) | règle D4 : rien d'inventé en prod, carte masquée si la donnée manque |

## 7. Plan de livraison

| Lot | Contenu | Estimation |
|---|---|---|
| 0 | Commit des lots 1–4 en attente (hors refonte) | 0,5 j |
| 2 | Tokens §3 (remappage `--ax-*`, D8), Inter (D10), `Icon` (registre des paths du prototype, lucide conservé en transition), illustrations SVG | 1 j |
| 3 | Composants de base §7.1–7.4, 7.9–7.13 + `/dashboard/_ui` (dev seulement) + tests de rendu (`react-dom/server`, sans nouvelle dépendance) + `COMPONENTS.md` | 2 j |
| 4 | IndexFilters, IndexTable, MetricsStrip, EmptyState, Charts SVG | 2 j |
| 5 | AppShell, Sidebar (§5.2, D18), PageHeader, MobileTopBar + tiroir, CommandPalette, AxiaDock + panneau (D12), SettingsShell, redirections | 2,5 j |
| 6 | Accueil (après D7) | 1 j |
| 7 | Commandes, fiche, livraison/retours/factures (paniers et brouillons selon D5) | 2 j |
| 8 | Produits, fiche (barre d'enregistrement), collections, stock, bons de commande, transferts | 2,5 j |
| 9 | Clients, fiche client, segments, avis | 1,5 j |
| 10 | Analyses, rapports | 1,5 j |
| 11 | Paramètres (shell + sections §3.2) | 2,5 j |
| 12 | Croissance, campagnes, affiliation, automatisations, réductions | 2 j |
| 13 | Contenu (fichiers) | 0,5 j |
| 14 | Canaux (boutique en ligne, préférences, WhatsApp, réseaux, POS en entrée) + applis IA | 2 j |
| 15 | États système, hors ligne, raccourcis, a11y, Lighthouse, nettoyage ancien code et recharts | 2 j |

Total ≈ 26 jours de travail agent ; les lots 7 à 14 se parallélisent par zone (agents séparés, fichiers disjoints) une fois le lot 5 livré. Captures `SCREENSHOTS/` via Playwright à chaque lot écran.

## 8. Arborescence proposée (adaptée à Next 16)

```
app/(dashboard)/
  layout.tsx                      → AppShell (serveur) ; données menu/permissions inchangées
  dashboard/
    page.tsx                      Accueil (D7)
    _ui/page.tsx                  recette des composants (notFound() en production)
    parametres/layout.tsx         SettingsShell
    …routes du §3
components/
  ui/                             kit existant restylé + nouveaux composants (un fichier par composant)
    icones/Icone.tsx, chemins.ts  registre des paths du prototype
    illustrations/*.tsx           états vides et vignettes du fil
    graphiques/*.tsx              Sparkline, LineChart, Donut, HorizontalBar, StackedBar
    IndexTable.tsx, IndexFilters.tsx, MetricsStrip.tsx, PageHeader.tsx, …
  dashboard/
    shell/                        AppShell, Sidebar, MobileTopBar, SettingsSidebar
    axia/                         AxiaPanneau (existant), AxiaDock
    recherche/                    CommandPalette (logique de lib/recherche-dashboard.ts)
lib/
  format.ts                       FCFA, dates relatives, téléphones (réutilise devise-convert, telephone)
  mocks/                          données typées de dev (jamais importées hors _ui et tests)
app/globals.css                   jetons §3 (variables CSS + @theme Tailwind)
docs/refonte-admin/               PLAN, DECISIONS, CHANGELOG, COMPONENTS, SCREENSHOTS/
tests/                            tests de composants + e2e Playwright (tests/e2e)
```

Écarts au §2 du masterprompt : pas de dossier `src/` ni `design-system/` séparé — le kit reste dans `components/ui` (82+ fichiers l'importent déjà, `@/components/ui`) ; pas de `features/` (Next range par route) ; pas de `fr.json` (D17).

---

**Arrêt pour validation.** Points à trancher : D5 (répartition §5 + Autopilot, Formulaire COD, Catégories/Collections), D7 (fusion Accueil), D9 (jaune `#EBA900`), D14 (AXIA vouvoie), et le lot 0 (commit des lots 1–4 avant de commencer).
