# Modèle de données de géolocalisation

## Trois niveaux de stockage

| Niveau | Support | Contenu | Durée |
|---|---|---|---|
| Chaud | Durable Object | Dernière position, tampon récent, état du géorepérage | Durée de la course |
| Tiède | `PositionCourse` (Postgres) | Points échantillonnés | 30 jours proposés |
| Froid | Agrégats par zone et heure | Vitesses et volumes, sans identité | Long terme |

## Point GPS reçu

```ts
type PointGps = {
  id: string;              // UUID créé sur l'appareil, clé de déduplication
  courseId: string;
  lat: number;             // -90 à 90
  lng: number;             // -180 à 180
  captureLe: string;       // date de l'appareil
  precisionM: number;
  capDeg?: number;
  vitesseMs?: number;
  altitudeM?: number;
  batterie?: number;       // seulement si autorisé
  reseau?: string;
};
```

## Validation serveur

| Contrôle | Résultat |
|---|---|
| Session et course active du livreur | Sinon 403 |
| Coordonnées hors bornes ou `0,0` | Rejet |
| Date future au-delà de 2 minutes | Rejet |
| Point trop ancien | Conservé en historique, n'écrase pas la dernière position |
| Identifiant déjà vu | Ignoré, réponse positive |
| Précision insuffisante | Stocké, exclu du géorepérage |
| Saut de position impossible | Marqué suspect, alerte, pas de sanction |

## Tables

```text
SessionSuivi       id, courseId, livreurId, consentementLe, debut, fin, motifFin
PositionCourse     id, courseId, captureLe, recuLe, lat, lng, precisionM, vitesseMs, capDeg, suspect
ItineraireCourse   id, courseId, version, fournisseur, profil, geometrie, distanceM, dureeS, calculeLe, motif
EstimationArrivee  id, courseId, debut, fin, confiance, distanceRestanteM, source, calculeLe, modeleVersion
Geozone            id, portee, type, centreLat, centreLng, rayonM, polygone, hysteresisM, presenceS, actif
EvenementGeo       id, courseId, geozoneId, type, survenuLe, precisionM, cleUnique
AnomalieCourse     id, courseId, type, severite, preuve, statut, explication, resoluPar, resoluLe
JetonSuivi         hash, courseId, role, expireLe, revoqueLe
AccesPosition      id, acteurId, role, courseId, motif, createdAt
```

Les jetons de suivi sont stockés **hachés**.

## Index géographiques

Choix initial : **cellules H3** stockées en colonne indexée, sans extension supplémentaire. PostGIS ne sera ajouté que si les requêtes de polygones le justifient.

- `PositionCourse (courseId, captureLe)`.
- `PositionCourse (captureLe)` pour la purge.
- `DisponibiliteFournisseur (celluleH3, disponible)`.
- `Geozone (portee, actif)`.

`PositionCourse` sera partitionnée par mois quand le volume le justifiera, pour purger sans balayage complet.
