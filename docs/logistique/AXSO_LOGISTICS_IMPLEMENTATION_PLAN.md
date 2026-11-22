# Plan d'implémentation unifié

Ce plan fusionne les trois cahiers des charges : Logistics Intelligence Network, Live Tracking et Autonomous Logistics V4. Chaque phase se livre, se teste et se déploie seule. Une phase n'est terminée que lorsque ses critères sont vérifiés.

| Phase | Livrable | Critères d'acceptation |
|---|---|---|
| **0. Sécurisation** | Correction des 4 failles de l'audit | Un marchand ne lit plus les positions des livreurs non assignés ; aucun envoi GPS hors course ; coordonnées invalides refusées ; lien client sans position après livraison |
| **1. Fondations** | Tables, rôles, outbox, journal | Migration additive sans écart ; lignes existantes identiques ; tests d'isolation verts |
| **2. Fournisseurs** | Onboarding société et livreur | Parcours complet ; documents privés ; aucun accès marchand à un document |
| **3. Vérification** | Machine d'états, expirations, relecture | Transition interdite refusée ; document expiré = inéligible ; historique complet |
| **4. Score** | 5 indicateurs, lissage, paliers, badges | Petit échantillon marqué « données insuffisantes » ; annulation marchand non pénalisée ; contestation possible |
| **5. Classement** | 6 catégories, explications | Fournisseur inéligible jamais proposé ; chaque recommandation cite des données réelles |
| **6. Tarifs** | Moteur de devis | Détail complet ; devis expiré refusé ; recalcul si les conditions changent ; aucune distance inventée |
| **7. Dashboard marchand** | Vue, comparaison, préférences | Une commande obtient une recommandation sans saisie supplémentaire |
| **8. Portails** | Société et livreur | Une société ne voit que sa flotte |
| **9. Dispatch** | Modes recommandation et semi-automatique | Délai, repli, réassignation, pas de double assignation sous concurrence |
| **10. Suivi** | Statuts, preuves, carte, temps réel | Position périmée affichée comme telle ; géorepérage seul ne vaut pas livraison |
| **11. ETA et anomalies** | Plages, confiance, alertes | Écart mesuré sur données de test ; aucune pénalité automatique |
| **12. Crédits** | Registre et droits par forfait | Aucun solde négatif ni double consommation sous 50 requêtes concurrentes |
| **13. Règlements** | Commissions, lots, rapprochement | Somme des écritures = somme des lots ; audit financier complet |
| **14. Tour de contrôle** | Admin, analytics, jumeau numérique | Données périmées signalées ; simulé jamais présenté comme réel |
| **15. Prévisions** | Demande, risque, alertes en shadow | Précision mesurée contre une référence naïve avant affichage |
| **16. Simulation** | Studio de scénarios | Aucune écriture dans les tables réelles, vérifiée par test |
| **17. Autonomie** | Mode autonome à faible risque, politiques versionnées | Shadow concluant ; pause et annulation immédiates ; chaque action traçable |
| **18. Multi-commandes** | Regroupement et équilibrage | Fenêtres horaires et capacité respectées ; détour borné |
| **19. Trust Graph et gouvernance** | Relations, versions de modèles | Aucune alerte fondée sur la seule association ; retour à une version précédente testé |
| **20. Recette et ouverture** | Bout en bout, pilote Douala | Parcours complet testé avec données simulées, puis pilote limité |

## Dépendances

```text
0 → 1 → 2 → 3 → 4 → 5 → 7 → 9 → 10 → 11 → 14 → 15 → 17 → 18
              6 ──────────↗      12 → 13          16 ↗     19
```

## Conditions préalables à décider

| Décision | Bloque | Recommandation |
|---|---|---|
| Bascule de `axsoafrica.com` vers Cloudflare | Temps réel WebSocket (phase 10) | Basculer avant la phase 10 ; sinon rester en polling |
| Fournisseur de carte et routage | Phases 6, 10, 11 | Tester sur de vrais trajets à Douala avant de choisir |
| Commission et crédits par forfait | Phases 6, 12, 13 | Modéliser le coût avant toute promesse commerciale |
| Paiement Mobile Money | Phase 13 automatisée | pawaPay après contrat ; règlement manuel contrôlé en attendant |
| Application native livreur | GPS en arrière-plan fiable | Le web suffit pour le pilote, écran allumé ; natif avant le passage à l'échelle |
| Cadre légal | Documents d'identité, géolocalisation | Faire valider conservation et consentement par un juriste local |

## Déploiement

1. Sauvegarde Neon et point de restauration noté.
2. Migration additive, contrôle des lignes et du schéma.
3. Fonctionnalité derrière un drapeau, désactivée.
4. Déploiement sur workers.dev et recette.
5. Activation pour un marchand pilote, puis élargissement.
