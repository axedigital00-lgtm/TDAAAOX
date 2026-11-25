# COD Engine — Phase 0 : audit de l'existant

Date : 25 novembre 2026. Branche : `refonte-charte-axso`.

Ce document recense ce qu'AXSO possède déjà pour chaque partie du master prompt « Commande Express AXSO », et les points où le prompt ne correspond pas à la stack réelle. Le plan (`01-PLAN.md`) en tient compte : rien de ce qui existe n'est réécrit.

## 1. Stack réelle

| Sujet | Réalité AXSO | Conséquence |
|---|---|---|
| Framework | Next.js 16 App Router, compilé pour **Cloudflare Workers** (vinext, Vite, Wrangler), Worker `axso-free` | Pas de serveur Node persistant ; tâches longues en arrière-plan via `after()` (waitUntil) ou tâche planifiée |
| Base | PostgreSQL Neon, **Prisma 7** (adaptateur pg), **228 modèles** | Le prompt parle de 13 modèles : obsolète |
| Locataire | Toutes les données sont scopées par **`tenantId`** (modèle `Tenant`) | Le prompt dit `storeId` : on garde `tenantId` |
| Tâches de fond | Pas de Redis ni de BullMQ. Tâches planifiées Cloudflare (`cloudflare/worker.mjs`) : toutes les 5 min (`lancements`, `logistique`, `paiements`, `versements`, `achatsCoins`), et quotidiennes | File = table « outbox » en base + passage toutes les 5 min, et `after()` pour l'immédiat |
| Paiement en ligne | **pawaPay uniquement** (Mobile Money direct, 14 pays ouverts), marque AXSO seule visible | Le prompt cite MTN MoMo, Orange Money, Wave, Flutterwave, AXESS Pay : on passe tout par pawaPay |
| Langues | Clé = texte français, dictionnaires `lib/i18n/en/*.json` (`useT` / `getT`) | Les libellés du module suivent ce système |
| Rôles | Propriétaire, membres d'équipe avec permissions par module (`lib/permissions.ts`), livreurs (espace dédié) | Rôle « Agent de confirmation » à ajouter comme niveau de permission |
| Forfaits | **Essentiel** (60 commandes/mois), **Pro**, **Illimité** (`lib/plans.ts`) | Le prompt prévoit 4 forfaits (Gratuit, Premium, Entreprise, Illimité) |
| Agents IA | « Contrôle IA » : modules d'outils (`lib/controle-ia/modules/*`), connecteurs (`lib/mcp/connectors/*`), journal d'actions | Les outils `cod.*` s'ajoutent comme un module de plus |

## 2. Ce qui existe déjà (à réutiliser)

| Fonction du prompt | Existant AXSO | État |
|---|---|---|
| Commande 1 écran sans compte, paiement à la livraison | `components/storefront/CheckoutForm.tsx` (parcours physique) + `app/api/commandes/whatsapp-creer/route.ts` | En production. Prix, remise, frais et stock **recalculés côté serveur** ; limite par IP ; WhatsApp au marchand |
| Zones et frais de livraison | `ReglePort` (pays, zone/quartier, montant min/max, frais, délai, mode) + `lib/livraison.ts` (`fraisLivraisonServeur`, `verifierZone`) + zones de la boutique | En production |
| Partage de position | `localisation` (lat/lng → lien Google Maps) dans le formulaire | En production |
| Codes promo | `CodePromo` + `reductionPromo` / `filtreUsagePromo` (`lib/pricing.ts`) | En production |
| Offres de quantité | Vente en gros par paliers (`venteGros`, `lib/commerce/gros.ts`) | Base existante, à présenter en « offres » avec badges et prix barrés |
| Pixels navigateur | Meta, TikTok, Snapchat (plusieurs pixels par plateforme), GTM, scripts libres | En production ; Google Ads, GA4 natif et Pinterest manquent |
| Événements d'analyse | `PixelEvent`, `Analytics`, conversions par expérience | En production |
| Tests A/B | `lib/builder/experiences.ts` (seau visiteur stable, z-test) | Pour la vitrine ; à étendre aux formulaires et offres |
| Relances automatiques | `lib/relances.ts` (bienvenue, après achat, panier abandonné des anciennes commandes en ligne, inactif) | WhatsApp et e-mail ; pas de capture de formulaire partiel |
| WhatsApp | Connecteur WhatsApp Cloud API par marchand (`lib/mcp/connectors/whatsapp.ts`), webhook entrant, envoi de messages | Utilisable pour confirmations et relances ; OTP WhatsApp = modèle d'authentification à faire valider par Meta |
| SMS | Connecteur Africa's Talking (`lib/mcp/connectors/sms.ts`) | Code présent, **aucun compte ni clé configurés** |
| Suivi livraison et encaissement | Logistique complète : courses, livreurs, sociétés certifiées, preuve de remise, encaissements COD par livreur, remise au marchand | En production |
| Quotas | `quotaCommandesAtteint` (Essentiel : 60/mois) | En production |
| Notifications marchand | Cloche + push + e-mail (`notifierMarchand`, `envoyerAlerteNouvelleCommande`) | En production |
| Blocs de thème / constructeur | Constructeur à sections + designs HTML de la bibliothèque AXSO | Le widget doit fonctionner dans les deux |

## 3. Ce qui n'existe pas

- Formulaire configurable par glisser-déposer, templates de formulaire, formulaires par produit, mode intégré et bouton collant.
- OTP sur téléphone (seul un code par e-mail existe, pour la connexion).
- Listes noires (IP, téléphone, e-mail), limites de commandes par téléphone, score de risque, réputation partagée.
- Upsells (« one-tick », pré-achat, post-achat 1 clic, downsell, cross-sell, cadeaux, emballage, protection, livraison prioritaire).
- Capture des formulaires abandonnés et séquence de relance dédiée.
- **Google Sheets** (aucune intégration Google).
- Pixels côté serveur (Conversions API, Events API, Measurement Protocol) et déduplication `event_id`.
- **Centre de confirmation** (file d'appels, statuts d'appel, agents, scripts, statistiques par agent).
- Tableau de bord COD dédié (entonnoir du formulaire, CA encaissé vs commandé par source, par zone, par agent).
- Mode hors-ligne tolérant (IndexedDB + idempotence).

## 4. Incohérences entre le prompt et AXSO (et recommandation)

1. **`storeId` → `tenantId`.** Recommandation : garder `tenantId` partout (cohérence avec les 228 modèles).
2. **Dossier `/modules/cod-engine`.** Le dépôt est organisé en `lib/`, `app/api/`, `components/`, `app/(dashboard)/…` avec des noms français. Recommandation : `lib/commande-express/*` (services), `app/api/commande-express/*`, `components/commande-express/*`, pages sous `app/(dashboard)/dashboard/commande-express/*`.
3. **Redis / BullMQ.** Indisponibles sur Cloudflare Workers. Recommandation : table `EvenementSortant` (outbox) traitée par `after()` puis rattrapée par la tâche planifiée de 5 minutes ; Cloudflare Queues plus tard si le volume l'exige.
4. **Prépaiement Mobile Money et acompte (2.2).** Décision récente : les produits physiques ne passent **pas** par la plateforme (paiement à la livraison, marchand prévenu). Recommandation : ne pas proposer de prépaiement par défaut ; option « acompte sur les frais de livraison » activable plus tard par le marchand, via pawaPay, si tu le décides.
5. **Prestataires de paiement multiples.** Tout passe par pawaPay, sans marque visible.
6. **4 forfaits du prompt vs 3 forfaits AXSO.** Recommandation : mapper Gratuit → Essentiel (60 commandes/mois, déjà la limite actuelle), Premium + Entreprise → Pro, Illimité → Illimité, et rendre les droits paramétrables en base (table de « fonctions par forfait »), sans créer de nouveaux forfaits tant que tu ne l'as pas décidé.
7. **`libphonenumber-js`.** Absent ; il pèse lourd pour un widget limité à 35 Ko. Recommandation : garder `normaliserTelephone` (déjà utilisé) côté navigateur, et la reconnaissance d'opérateur par pawaPay (`predict-provider`) côté serveur, déjà en place.
8. **OTP par SMS ou WhatsApp.** Aucun compte SMS configuré ; l'OTP WhatsApp exige un compte WhatsApp Business d'AXSO et un modèle « authentification » validé par Meta. Recommandation : OTP par WhatsApp en priorité (moins cher, plus fiable en Afrique) dès que le compte Meta d'AXSO est prêt ; SMS en secours quand un compte Africa's Talking est ouvert. En attendant, l'anti-fraude repose sur le score de risque, les listes noires et les limites.
9. **Google Sheets.** Nécessite un projet Google Cloud d'AXSO avec écran de consentement OAuth (le droit `drive.file` est non sensible, donc pas d'audit de sécurité Google) et la clé API Sheets.
10. **Ampleur.** Les 11 phases représentent plusieurs semaines de travail. Recommandation : livrer par ordre de valeur pour le COD africain (voir le plan) et mettre en ligne après chaque phase.

## 5. Points de vigilance

- Ne jamais perdre une commande : la création reste dans la même transaction que la sortie de stock, comme aujourd'hui ; quotas, Sheets, pixels et messages se font après, sans bloquer.
- Le widget vitrine doit rester léger : script autonome (sans React) chargé en différé, configuration publique compilée et mise en cache.
- Données personnelles : téléphones hachés pour la réputation partagée, consentement affiché, export et suppression sur demande.
