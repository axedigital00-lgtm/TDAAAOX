# Événements logistiques et temps réel

## Fiabilité

Un changement métier et son événement sont écrits **dans la même transaction** (`EvenementSortant`). Un traitement les publie ensuite, au moins une fois. Les consommateurs sont idempotents grâce à l'identifiant d'événement.

```ts
type EvenementLogistique<T> = {
  id: string;
  type: string;
  version: 1;
  survenuLe: string;
  acteur: { type: "marchand" | "societe" | "livreur" | "client" | "admin" | "systeme"; id?: string };
  portee: { tenantId?: string; societeId?: string; courseId?: string };
  causeId?: string;   // événement ou décision à l'origine
  donnees: T;
};
```

Le bus existant `publier()` reste utilisé pour les automatisations et webhooks. L'outbox s'y branche.

## Catalogue

| Domaine | Événements |
|---|---|
| Commande | `order.created`, `delivery.requested` |
| Devis | `quote.generated`, `quote.expired` |
| Assignation | `assignment.created`, `assignment.accepted`, `assignment.rejected`, `assignment.timeout`, `assignment.reassigned` |
| Course | `pickup.confirmed`, `delivery.in_transit`, `delivery.completed`, `delivery.failed`, `delivery.returned`, `delivery.disputed` |
| Géo | `COURIER_NEAR_PICKUP`, `COURIER_ARRIVED_AT_PICKUP`, `PACKAGE_PICKED_UP`, `COURIER_NEAR_DESTINATION`, `COURIER_ARRIVED_AT_DESTINATION`, `DELIVERY_LOCATION_CONFIRMED` |
| Suivi | `eta.changed`, `signal.lost`, `signal.restored`, `anomaly.detected`, `anomaly.resolved` |
| Crédits | `credits.reserved`, `credits.consumed`, `credits.released`, `credits.reversed` |
| Réputation | `provider.score_updated`, `provider.suspended`, `verification.changed` |
| Finance | `settlement.created`, `settlement.paid` |
| V4 | `dispatch.decided`, `dispatch.overridden`, `policy.published`, `forecast.published`, `alert.raised` |

## Machine d'états de la course

```text
awaiting_provider → provider_assigned → awaiting_acceptance → accepted
accepted → pickup_scheduled → picked_up → in_transit → near_destination → delivered
états actifs → delivery_failed → returned
états avant remise → cancelled
delivered ou delivery_failed → disputed
```

Toute transition absente de ce schéma est refusée côté serveur. `Commande.statut` est mis à jour dans la même transaction, pour que les écrans existants continuent de fonctionner.

## Canaux WebSocket

| Canal | Qui | Données |
|---|---|---|
| `course:{id}:client` | Porteur du lien, en phase de livraison | Statut, plage d'ETA, position selon l'étape |
| `course:{id}:marchand` | Marchand de la commande | Suivi complet de sa course |
| `flotte:{societeId}` | Admins de la société | Sa flotte uniquement |
| `marchand:{tenantId}` | Membres autorisés | Résumé de ses courses actives |
| `tour:{pays}` | Rôles AXSO autorisés | Agrégats, détail à la demande et journalisé |

Messages : `snapshot` à la connexion, `position`, `status`, `eta`, `alert`, `stale`. Chaque message porte une séquence ; après une coupure, le client demande ce qui lui manque ou recharge un `snapshot`.

## Notifications

Déclenchées par les événements, selon les préférences : in-app, Web Push, WhatsApp, SMS, e-mail, avec nouvelles tentatives. Aucune coordonnée GPS dans un message : seulement un lien sécurisé.
