# AXSO Logistics Intelligence Network : audit et architecture

Statut : proposition à valider. Aucun code de production n'a été modifié pour ce document.
Base auditée : commit `0b0049a`, branche `refonte-charte-axso`, le 22 novembre 2026.

## 1. Ce qui existe déjà

| Domaine | Existant | Décision |
|---|---|---|
| Application | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 | Conserver |
| Hébergement | `axsoafrica.com` sur Vercel ; préproduction Cloudflare Workers (`axso-free`) | Viser Workers après bascule |
| Base | PostgreSQL Neon, Prisma 7, 195 tables, données réelles | Migrations additives uniquement |
| Authentification | next-auth, rôles `owner`, `livreur`, `affilie`, rôles admin (`lib/command-center/rbac.ts`) | Ajouter des rôles, pas un second système |
| Permissions | Grille par module appliquée dans `proxy.ts` (`lib/permissions-api.ts`) | Ajouter le module `logistique` |
| Marchands | `Tenant`, `ProprietaireBoutique`, `MembreEquipe` | Réutiliser |
| Commandes | `Commande`, `LigneCommande`, cycle dans `lib/cycle-livraison.ts` | Réutiliser, ne pas créer de table de commande |
| Livreurs | `Livreur` (`tenantId` nul = indépendant), espace `/livreur`, validation, disponibilité | Étendre |
| Tarifs | `ReglePort` par boutique, `lib/livraison.ts` | Garder pour le tarif client ; le moteur fournisseur s'ajoute |
| Gains | `GainLivreur`, `SoldeLivreur`, `RetraitLivreur`, `ReglageLivreur` | Étendre vers les règlements |
| Preuve | Code à 4 chiffres, 5 essais maximum | Conserver comme preuve OTP par défaut |
| Expéditions | `Expedition`, `transporteur`, `numeroSuivi` | Réutiliser pour le fret et le sourcing |
| Abonnements | `lib/plans.ts`, `lib/abonnement*.ts`, activation manuelle par l'admin | Ajouter les droits de livraison côté serveur |
| Paiement | Pas d'encaissement en ligne actif ; COD ; retraits manuels | Registre + règlement contrôlé, pas de split supposé |
| Événements | `publier()` et `EvenementIA` (`lib/controle-ia/evenements.ts`) | Étendre avec une boîte d'envoi transactionnelle |
| Notifications | `NotificationMarchand`, Web Push, e-mail Resend, WhatsApp, SMS selon configuration | Réutiliser |
| Audit | `AuditAdmin`, `JournalAudit` | Réutiliser pour l'admin, table dédiée pour les décisions |
| Administration | Command Center `/admin`, Cockpit 3D | Y intégrer la tour de contrôle |

## 2. Failles à corriger avant toute extension (phase 0)

| Priorité | Constat | Fichier | Correction |
|---|---|---|---|
| Critique | Tout marchand connecté obtient le téléphone et la position GPS de **tous** les livreurs indépendants | `app/api/livreurs/plateforme/route.ts` | Retirer téléphone et position ; les révéler seulement au marchand d'une course assignée |
| Critique | Un livreur est géolocalisé toutes les 30 s dès que son espace est ouvert, même sans course | `components/livreur/GeoTracker.tsx` | Aucun envoi hors course sans activation visible par le livreur |
| Élevée | La position n'est ni validée (type, bornes, date) ni limitée en débit | `app/api/livreurs/[id]/position/route.ts` | Schéma, limite de débit, contrôle de course active |
| Élevée | Le lien client n'expire pas et continue d'exposer la dernière position après livraison | `app/api/tracking/[token]/route.ts` | Masquer la position hors transit, expiration et révocation |

## 3. Principes

1. **Une seule vérité.** `Commande` reste la commande ; une `CourseLivraison` représente sa prise en charge logistique.
2. **Le statut légal et la performance sont séparés.** Aucune note ne compense un document invalide, et l'inverse non plus.
3. **Aucune valeur inventée.** Sans itinéraire, pas de distance ni d'ETA : l'interface affiche « indisponible ».
4. **L'autonomie se gagne.** Ordre imposé : recommandation, shadow mode, semi-automatique, autonome sur opérations à faible risque.
5. **Chaque décision automatique est explicable** : données sources, version de politique, version de modèle, alternatives écartées.
6. **Le cœur survit aux pannes.** Sans IA, carte ou routage, créer, assigner, livrer et prouver restent possibles.
7. **L'argent passe par un registre.** Écritures immuables, clés d'idempotence, jamais de solde modifié directement.

## 4. Découpage

```text
lib/logistique/
  types.ts              contrats partagés
  fournisseurs/         sociétés, livreurs, onboarding
  verification/         machine d'états des documents
  score/                score bayésien, décroissance, paliers, badges
  classement/           éligibilité, classement, explications
  tarifs/               moteur de devis
  dispatch/             assignation, délai, repli, idempotence
  suivi/                statuts, preuves, ETA, géorepérage, anomalies
  credits/              registre des crédits
  reglements/           commissions, lots, rapprochement
  prevision/            demande, risque, gouvernance des modèles
  jumeau/               état du réseau et simulation isolée
  evenements/           boîte d'envoi
```

Les règles sont des **fonctions pures testées**, sans accès base. Les services les orchestrent. Les routes valident, autorisent, puis délèguent.

## 5. Interfaces

| Acteur | Route | Contenu |
|---|---|---|
| Marchand | `/dashboard/logistique/*` (existant, étendu) | Vue d'ensemble, recommandations, suivi, incidents, dépenses, crédits |
| Société | `/transporteur/*` | Onboarding, documents, zones, tarifs, flotte, règlements |
| Livreur | `/livreur/*` (existant, étendu) | Disponibilité, courses, carte, preuve, gains |
| Client | `/[slug]/tracking/[token]` (existant, étendu) | Statut, ETA en plage, carte selon l'étape |
| AXSO | `/admin/logistique/*` | Vérification, règles, litiges, règlements, tour de contrôle |
| Public | `/transporteurs` | Profils sans document ni donnée personnelle |

## 6. Sécurité

- Documents légaux et d'identité dans un **stockage privé**, lus par URL signée courte, chaque accès journalisé. Jamais visibles par les marchands.
- Isolation par `tenantId` pour les marchands et `societeId` pour les sociétés, testée sur chaque route.
- Une action sensible exige un rôle admin dédié et produit une ligne d'audit avec l'état avant et après.
- Un fournisseur peut contester une pénalité ; toute correction de score est tracée.
