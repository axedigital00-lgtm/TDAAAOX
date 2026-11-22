# État de l'implémentation logistique

Mis à jour le 2026-11-22. Rien de ce réseau n'est encore en production : la migration `20261123090000_reseau_logistique` n'est appliquée qu'en local.

## Livré et testé

- Réseau : inscription société ou livreur, documents privés chiffrés, vérification, suspension, score, niveaux, badges, classement expliqué, tarifs versionnés.
- Portail : flotte, équipe, zones, capacité et tarif modifiables après l'inscription.
- Dispatch : autonomie active par défaut avec garde-fous (forte valeur, note minimale, essai plafonné, pause, déploiement en %), réassignation, idempotence, reprise manuelle, audit.
- Course : statuts, chronologie, preuve par code, photo chiffrée ou signature, incidents, litiges, avis, synchronisation avec la commande.
- GPS : partage visible pendant la course, file hors ligne, lots, déduplication, purge, géorepérage d'arrivée, liens client expirants.
- Temps réel : flux SSE par course avec repli périodique.
- Routage : OSRM auto-hébergé (`ROUTAGE_URL`), repli à vol d'oiseau. Voir `ROUTAGE_OSRM.md`.
- Finance : crédits, écritures par course, lots, contrat de versement généré et signé, versements automatiques idempotents avec plafond.
- Pilotage : jumeau 2D/3D, tournée multi-arrêts, prédiction, gouvernance des modèles, graphe de confiance, rentabilité par ville, simulation.

## Vérifications

- Parcours services : 57/57. Parcours suite : 44/44. Parcours navigateur marchand et transporteur : 27/27.
- Le routage et les versements sont testés contre des serveurs simulés, pas contre un vrai OSRM ni le vrai pawaPay.

## Non vérifié

- `/admin/logistique` n'a pas été ouvert dans un navigateur connecté : aucun compte admin de test n'est disponible.

## À fournir avant l'activation réelle

- Identité légale d'AXSO : `AXSO_RAISON_SOCIALE`, `AXSO_SIEGE`, `AXSO_REGISTRE`, `AXSO_DROIT_APPLICABLE`. Sans elles, le contrat ne peut pas être signé.
- Relecture du contrat par un juriste.
- Compte pawaPay : `PAWAPAY_API_TOKEN`, `PAWAPAY_API_URL`, puis `AXSO_VERSEMENTS_AUTO=1`.
- Serveur OSRM : `ROUTAGE_URL`.
- Migrations `20261123090000_reseau_logistique` et `20261124090000_logistique_autonomie` sur Neon.

## Non implémenté

- WebSockets et Durable Objects : le direct passe par SSE.
- Trafic routier en temps réel.
- GPS natif en arrière-plan : nécessite une application mobile.
