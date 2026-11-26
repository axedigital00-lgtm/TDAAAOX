# COD Engine — Phase 0 : plan d'exécution

Nom marchand : **Releasit COD AXSO**. Nom interne : `commande-express`.
Ce plan s'appuie sur l'audit (`00-AUDIT.md`). Il réutilise le parcours de commande à la livraison, les zones, les codes promo, la vente en gros, les pixels, les tests A/B, la logistique et les quotas existants. Chaque phase se termine par des tests verts, une migration Neon appliquée avec accord, un déploiement et une ligne dans `CHANGELOG.md`.

## Ordre proposé (par valeur pour le COD africain)

| Phase | Contenu | Pourquoi maintenant |
|---|---|---|
| **1. Socle** | Modèles, réglages, formulaire popup léger (script < 35 Ko) branché sur la création de commande existante, idempotence, bouton collant mobile, bloc de thème, UTM et identifiants de clic | Base de tout le reste ; aucune commande perdue |
| **2. Centre de confirmation** | File « À confirmer », appel / WhatsApp, statuts d'appel, édition, agents, statistiques, suivi jusqu'à l'encaissement (branché sur la logistique existante) | Le taux de confirmation fait l'essentiel du CA réel en COD |
| **3. Anti-fraude** | Score de risque 0–100 expliqué, listes noires, limites par téléphone/IP, anti-bot (honeypot, jeton signé), réputation partagée (option) ; OTP WhatsApp quand le compte Meta d'AXSO est prêt | Réduit les refus à la livraison |
| **4. Offres** | Offres de quantité (sur la base de la vente en gros), one-tick, upsell post-achat 1 clic, downsell, cadeaux, emballage, protection, livraison prioritaire, règles d'affichage | Hausse directe du panier moyen |
| **5. Google Sheets** | OAuth, envoi en temps réel, colonnes configurables, test et diagnostic, mise à jour des lignes, onglet tableau de bord, puis retour des statuts (Apps Script signé) et routage multi-feuilles | Outil de travail n°1 des équipes COD |
| **6. Éditeur** | Glisser-déposer, 6 templates, champs personnalisés, formulaires par produit, mode intégré, multilingue et multi-devises, mode hors-ligne tolérant | Personnalisation premium |
| **7. Abandons** | Capture dès le téléphone valide (avec consentement), relances WhatsApp +15 min / +2 h / +24 h avec lien de reprise | Récupère des ventes perdues |
| **8. Pixels serveur** | Conversions API Meta, Events API TikTok, GA4 Measurement Protocol, déduplication `event_id`, option « Purchase à la confirmation » | Meilleur rendement publicitaire |
| **9. Analytics, A/B, IA, forfaits** | Entonnoir, CA encaissé vs commandé, par source, zone, agent ; A/B des formulaires et offres ; recommandeur IA ; droits par forfait en base ; outils `cod.*` pour Contrôle IA | Pilotage |
| **10. Durcissement** | Performance 3G (Lighthouse ≥ 90), sécurité, accessibilité, documentation marchand, matrice de parité | Qualité de production |

## Organisation du code

- `lib/commande-express/` : `prix.ts` (recalcul serveur), `offres.ts`, `risque.ts`, `otp.ts`, `commande.ts`, `sheets/`, `pixels-serveur/`, `abandons.ts`, `quotas.ts`, `outbox.ts`.
- `app/api/commande-express/[slug]/…` : soumission, OTP, upsell post-achat, abandon (publics, limités par IP) ; `app/api/commande-express/admin/…` (protégés).
- `public/commande-express.js` : widget vitrine autonome, compilé et minifié.
- `app/(dashboard)/dashboard/commande-express/*` : vue d'ensemble, formulaires, offres, livraison et frais, anti-fraude, confirmation, abandons, analytics, intégrations, réglages. Nouvel espace dans la navigation (ordinateur et mobile).
- Tests : `tests/commande-express-*.test.ts` (prix, risque, offres, routage Sheets, idempotence, isolation entre marchands).

## Modèles (Phase 1, ajouts seulement)

`ReglagesCommandeExpress`, `FormulaireCommande` (+ versions publiées), `AffectationFormulaire`, `CommandeExpress` (lien 1-1 avec `Commande` : quartier, repère, position, score et facteurs de risque, OTP vérifié, UTM, identifiants de clic, clé d'idempotence unique, statut de confirmation, agent, montant encaissé), `EvenementSortant` (outbox). Les zones restent `ReglePort` ; les frais COD et offres arrivent avec leurs phases. Tous scopés par `tenantId`, avec index `(tenantId, createdAt)` et `(tenantId, statutConfirmation)`.

## Ce qu'il faudra de ton côté

- **Phase 3 (OTP)** : compte WhatsApp Business d'AXSO et modèle d'authentification validé par Meta ; ou compte Africa's Talking pour les SMS.
- **Phase 5 (Sheets)** : projet Google Cloud d'AXSO, écran de consentement OAuth, identifiants OAuth.
- **Phase 8 (pixels serveur)** : rien pour AXSO ; chaque marchand fournit ses jetons.
- **Forfaits** : confirmer le rattachement proposé (Gratuit → Essentiel, Premium/Entreprise → Pro, Illimité → Illimité) ou décider de nouveaux forfaits.

## Risques

- Charge de travail importante : je livre et mets en ligne phase par phase.
- Quotas Google Sheets : écritures regroupées, reprises avec délai croissant.
- Doublons : clé d'idempotence unique en base + file locale côté navigateur.
- Données personnelles : minimisation, hachage, consentement, journal d'accès des agents.
