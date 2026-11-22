# AXSO Autonomous Logistics V4 : architecture

V4 s'appuie sur les phases précédentes : sans historique réel de courses, il n'y a ni prévision ni autonomie fiables. **AXSO compte aujourd'hui 2 commandes en production** : les modèles statistiques et l'apprentissage restent donc désactivés jusqu'à un volume suffisant.

## 1. Jumeau numérique

État dérivé des événements : fournisseurs, véhicules, courses, zones, capacité, risques. Chaque entité porte `etat`, `observeLe`, `fraicheur` (`direct`, `recent`, `perime`, `inconnu`) et `source`.

La carte 3D réutilise le moteur WebGL du Cockpit pour la vue réseau et MapLibre pour la vue ville. La 2D reste la vue par défaut.

**Simulation** : elle lit une copie en mémoire de l'état et n'a **aucun accès en écriture**. Les résultats portent la mention « simulé ». Un test vérifie qu'aucune table réelle ne change.

## 2. Prévision

| Niveau | Condition de volume | Méthode |
|---|---|---|
| 0 | Peu de données | Aucune prévision : « données insuffisantes » |
| 1 | 8 semaines d'historique | Référence saisonnière jour × heure |
| 2 | 6 mois | Lissage exponentiel avec intervalles |
| 3 | Gain mesuré contre le niveau 2 | Apprentissage automatique |

Un modèle n'est publié que s'il bat la référence naïve sur des données mises de côté. Les variables de risque sont opérationnelles uniquement : aucun profilage de client par quartier, nom ou origine.

Chaque alerte contient : sévérité, explication, preuves, opérations touchées, action proposée, confiance, statut.

## 3. Dispatch autonome

```text
Demande → validation → éligibilité (règles dures) → devis → disponibilité
       → score multi-objectif → décision → exécution ou approbation → suivi → repli
```

Les **règles dures** ne se négocient jamais : document expiré, suspension, zone non couverte, véhicule ou capacité incompatibles.

Score configurable : fiabilité, délai, coût, charge, préférence marchand, avec une part d'exploration bornée pour les nouveaux fournisseurs.

| Mode | Comportement | Condition d'activation |
|---|---|---|
| A. Recommandation | AXSO propose, le marchand valide | Par défaut |
| B. Semi-automatique | Assignation selon ses règles, intervention possible | Choix du marchand |
| C. Autonome | Sélection, suivi et réassignation | Shadow concluant, faible risque, accord du marchand |

Contrôles humains : pause globale ou par marchand, annulation, réassignation, dérogation, escalade. Chaque action produit une ligne d'audit.

Chaque `DecisionDispatch` stocke : données d'entrée, version de politique, version de modèle, alternatives et motifs de rejet, résultat.

## 4. Trust Graph

Représenté par des **tables d'arêtes dans Postgres**, sans base graphe supplémentaire au départ. Une association seule ne déclenche jamais d'alerte de fraude. Toute alerte exige des preuves, une revue humaine et un droit de recours.

## 5. Intelligence financière

Calculée depuis les écritures immuables (`EcritureFinanceCourse`, `EcritureCredit`). Elle peut recommander un prix, mais **ne change jamais un prix et ne règle jamais d'argent** sans règle autorisée.

## 6. Gouvernance des modèles

- Versions du modèle et des données d'entraînement.
- Évaluation hors ligne, puis shadow mode, puis activation progressive.
- Retour immédiat à la version précédente.
- Données frauduleuses ou contestées exclues de l'entraînement.
- Part d'exploration et suivi d'équité, pour éviter qu'un fournisseur déjà bien classé capte tout le volume.

## 7. Dégradation

| Panne | Comportement |
|---|---|
| IA ou prévision | Classement par règles |
| Routage | Pas d'ETA ; assignation par zone |
| Carte | Liste, statuts et chronologie |
| Temps réel | Polling |
| Dispatch | Assignation manuelle |

## 8. Déploiement

Ordre imposé : jumeau, prévision, alertes en shadow, recommandations, semi-automatique, autonome à faible risque, multi-commandes, réseau, nouvelles villes. Le passage à l'étape suivante exige les critères du plan d'implémentation.
