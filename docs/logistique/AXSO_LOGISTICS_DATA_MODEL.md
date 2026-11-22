# Modèle de données logistique

> **Implémentation :** les sociétés et les livreurs indépendants partagent la table `FournisseurLogistique` (`type = societe | livreur`). Il n'existe pas de table `SocieteLivraison` séparée.

Règle : migrations **additives**, appliquées avec une sauvegarde Neon préalable. La base de production n'a pas d'historique `_prisma_migrations` : `prisma migrate deploy` y reste interdit tant que cet historique n'est pas initialisé.

## Correspondance avec le cahier des charges

| Entité demandée | Modèle AXSO | Nature |
|---|---|---|
| Merchant | `Tenant` | Existant |
| Order | `Commande` | Existant |
| IndependentCourier | `Livreur` avec `tenantId` nul | Étendu |
| Livreur d'une société | `Livreur.societeId` | Étendu |
| DeliveryCompany | `FournisseurLogistique` (`type = societe`) | Nouveau |
| Administrateurs société | `MembreSociete` | Nouveau |
| CourierIdentity, CompanyVerification | `DossierVerification` | Nouveau, polymorphe |
| VerificationDocument | `DocumentVerification` | Nouveau |
| FleetVehicle | `VehiculeFlotte` | Nouveau |
| ServiceZone | `ZoneService` | Nouveau |
| DeliveryService | `ServiceLivraison` | Nouveau |
| ProviderAvailability | `DisponibiliteFournisseur` | Nouveau |
| ProviderPricingRule | `RegleTarifFournisseur` | Nouveau, versionné |
| DeliveryQuote | `DevisLivraison` | Nouveau |
| DeliveryOrder | `CourseLivraison` (1 course active par `Commande`) | Nouveau |
| DeliveryAssignment | `AssignationCourse` | Nouveau |
| DeliveryTrackingEvent | `EvenementCourse` | Nouveau, en ajout seul |
| DeliveryProof | `PreuveLivraison` | Nouveau |
| ProviderPerformance, ProviderScoreHistory | `PerformanceFournisseur`, `HistoriqueScore` | Nouveau |
| ProviderReview | `AvisFournisseur` | Nouveau |
| DeliveryIncident, DeliveryDispute | `IncidentCourse`, `LitigeCourse` | Nouveau |
| SubscriptionDeliveryEntitlement | `DroitLivraisonPlan` | Nouveau, configuré côté serveur |
| DeliveryCreditLedger | `EcritureCredit` | Nouveau, immuable |
| ProviderSettlement | `LotReglement`, `LigneReglement` | Nouveau |
| PlatformCommission | `EcritureFinanceCourse` | Nouveau, immuable |
| LogisticsAuditLog | `JournalLogistique` | Nouveau |
| Outbox | `EvenementSortant` | Nouveau |
| Politiques V4 | `PolitiqueDispatch` | Nouveau, versionné |
| Décisions V4 | `DecisionDispatch` | Nouveau |
| Modèles V4 | `VersionModele`, `EvaluationModele` | Nouveau |
| Simulation V4 | `ScenarioSimulation` | Nouveau, sans lien d'écriture vers le réel |

## Fournisseur

Un fournisseur est soit une société, soit un livreur. Contrainte SQL : exactement l'un des deux champs renseigné.

```sql
CHECK ((societe_id IS NOT NULL) <> (livreur_id IS NOT NULL))
```

## Contraintes qui protègent le système

| Risque | Protection |
|---|---|
| Deux courses actives pour une commande | Index unique partiel sur `commandeId` quand la course n'est pas terminée |
| Deux assignations ouvertes | Index unique partiel sur `courseId` pour les statuts `proposee`, `acceptee` |
| Société et son livreur sur la même course | La course porte un seul fournisseur actif ; un livreur affilié est une sous-affectation de l'assignation société |
| Double traitement | `cleIdempotence` unique sur assignations, écritures et événements |
| Double consommation de crédit | `UNIQUE (courseId, type)` sur les écritures de réservation et de consommation |
| Solde négatif | Verrou par marchand dans la transaction, solde calculé puis vérifié |
| Devis périmé | `expireLe` et empreinte des conditions, contrôlés à l'assignation |
| Statut légal non prouvé | Le statut `verifie` n'est écrit que par le service de vérification, avec relecteur et document valides |

## Crédits de livraison

États : `disponible`, `reserve`, `consomme`, `libere`, `expire`, `annule`.

Chaque écriture porte : marchand, abonnement, commande, course, montant, type, date, référence, écriture annulée. Une correction est une **nouvelle écriture**, jamais une modification.

## Économie d'une course

```text
prix fournisseur = versement fournisseur + commission plateforme
prix marchand    = prix fournisseur − crédits et subvention AXSO + taxes applicables
contribution AXSO = commission + part marchand − subvention − frais de paiement
```

Tous les montants sont stockés avec leur devise. Le code existant utilise `Float` ; **les nouvelles tables financières utilisent `Decimal(14,2)`**.

## Index principaux

- `CourseLivraison (tenantId, statut, createdAt)`, `(fournisseurId, statut)`.
- `EvenementCourse (courseId, survenuLe)`.
- `AssignationCourse (statut, expireLe)` pour les délais.
- `EvenementSortant (statut, prochainEssai)`.
- `DocumentVerification (statut, expireLe)` pour les alertes.
- `EcritureCredit (tenantId, createdAt)`.
