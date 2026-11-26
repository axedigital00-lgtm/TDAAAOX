# Releasit COD AXSO — matrice de parité

Chaque fonctionnalité du cahier des charges (sections 2.1 à 2.11), son équivalent AXSO, son statut et le fichier principal.
Statuts : **Fait** · **Partiel** (l'essentiel est là, une partie reste) · **En attente** (dépend d'un accès extérieur).

| § | Fonctionnalité | Équivalent AXSO | Statut | Fichier principal |
|---|---|---|---|---|
| 2.1 | Formulaire 1 clic en popup, bouton collant mobile | Bouton collant + fenêtre 1 écran | Fait | `public/commande-express.js` |
| 2.1 | Formulaire intégré dans la page, mode panier | Ouverture par tout élément `data-axso-commande` (bloc du constructeur) ; panier complet non branché | Partiel | `public/commande-express.js` |
| 2.1 | Parcours COD sans checkout standard | Création directe de la commande | Fait | `app/api/commande-express/[slug]/route.ts` |
| 2.1 | Éditeur (ordre, libellés, obligatoire) | Éditeur : glisser-déposer + flèches, aperçu en direct | Fait | `app/(dashboard)/dashboard/commande-express/formulaire/page.tsx` |
| 2.1 | Champs personnalisés | Texte, liste, case ; obligatoires vérifiés côté serveur | Fait | `lib/commande-express/formulaire.ts` |
| 2.1 | Design, 6 modèles, animations, messages | Minimal, Premium sombre, Afro-chic, Flash promo, Luxe or, Mobile compact ; pulsation, secousse, halo ; titre, sous-titre, bouton, message de succès | Fait | `lib/commande-express/formulaire.ts` |
| 2.1 | CSS personnalisé, formulaires par produit | Non fait (un formulaire par boutique) | À faire | — |
| 2.1 | Ville → quartier, repère, position | Zones de livraison, quartier, repère, géolocalisation | Fait | `public/commande-express.js` |
| 2.1 | Multilingue, multidevise | Textes traduits (FR/EN), devise de la boutique | Fait | `components/storefront/CommandeExpressWidget.tsx` |
| 2.1 | Téléphone intelligent | Indicatif du pays, normalisation internationale | Fait | `lib/devise-convert.ts` |
| 2.1 | Mode hors-ligne tolérant | Commande gardée sur l'appareil, renvoyée au retour du réseau, même clé (jamais de doublon) | Fait | `public/commande-express.js` |
| 2.2 | Frais COD, incitation au prépaiement, acompte Mobile Money | Frais de livraison par zone ; prépaiement non branché sur le formulaire | Partiel | `lib/livraison.ts` |
| 2.3 | OTP SMS / WhatsApp | Attend le compte WhatsApp Business d'AXSO ou Africa's Talking | En attente | — |
| 2.3 | Listes noires, limites par jour | Numéros et connexions ; limite par numéro et connexion sur 24 h | Fait | `lib/commande-express/anti-fraude.ts` |
| 2.3 | Score de risque 0–100 expliqué | 10 facteurs, raisons affichées, tri de la file d'appel | Fait | `lib/commande-express/risque.ts` |
| 2.3 | Anti-robot | Champ piège, jeton signé, temps de remplissage, limite de débit | Fait | `lib/commande-express/risque.ts` |
| 2.3 | Réputation partagée entre boutiques | Option non faite | À faire | — |
| 2.4 | Offres de quantité (page produit et formulaire) | Paliers, badge, prix barré ; appliqués par le serveur (aussi au panier) | Fait | `lib/commande-express/offres.ts` |
| 2.4 | Upsell one-tick, post-achat 1 clic, downsell | Case à cocher ; ajout 1 clic (jeton 30 min) ; code promo à la fermeture | Fait | `lib/commande-express/offres.ts` |
| 2.4 | Cadeaux, emballage, protection, livraison prioritaire | Produits « service » proposés en case à cocher | Fait | `app/(dashboard)/dashboard/commande-express/offres/page.tsx` |
| 2.4 | Codes promo | Moteur de réductions AXSO, revérifié par le serveur | Fait | `app/api/commandes/whatsapp-creer/route.ts` |
| 2.4 | Recommandations IA | Suggestions calculées sur les ventes (meilleure vente, achetés ensemble…) + outils Stella | Fait | `lib/commande-express/suggestions.ts` |
| 2.4 | A/B testing | Texte du bouton, attribution stable par visiteur, significativité, gagnant | Fait (bouton) | `lib/commande-express/statistiques.ts` |
| 2.5 | Capture des abandons, relances WhatsApp | Capture dès nom + téléphone (consentement affiché), relances automatiques aux délais choisis, récupération | Fait | `lib/commande-express/abandons.ts` |
| 2.6 | Pixels navigateur (Meta, TikTok, Google, Snapchat) | Pixels multiples de la boutique, événements InitiateCheckout / Purchase / Lead | Fait | `public/commande-express.js` |
| 2.6 | API serveur + déduplication | Meta Conversions API, TikTok Events API, même `event_id` (n° de commande), données hachées | Fait | `lib/commande-express/pixels-serveur.ts` |
| 2.6 | Purchase à la confirmation | Réglage « À la confirmation » | Fait | `app/api/commande-express/confirmation/[id]/route.ts` |
| 2.6 | UTM et identifiants de clic | utm_*, fbclid, ttclid, gclid sur chaque commande | Fait | `lib/commande-express/reglages.ts` |
| 2.7 | Google Sheets (temps réel, colonnes, bidirectionnel, routage) | Attend le projet Google Cloud d'AXSO (identifiants OAuth) | En attente | — |
| 2.8 | Centre de confirmation | File triée, appel, WhatsApp pré-rédigé, statuts, rappels, historique, chiffres par agent | Fait | `app/(dashboard)/dashboard/commande-express/confirmation/page.tsx` |
| 2.8 | Rôle Agent, tourniquet, scripts d'appel | Accès par les droits « commandes » existants ; tourniquet et scripts non faits | Partiel | `lib/commande-express/acces.ts` |
| 2.8 | Suivi livraison et encaissement | Cycle de livraison AXSO existant, taux de livraison après confirmation | Fait | `lib/cycle-livraison.ts` |
| 2.9 | Analytics | Entonnoir, CA commandé / encaissé, panier moyen, sources, villes, A/B | Fait | `app/api/commande-express/statistiques/route.ts` |
| 2.10 | Plans et quotas | Quota mensuel des forfaits AXSO (60 commandes en Gratuit), jamais de commande perdue | Fait | `lib/abonnement.ts` |
| 2.11 | Outils pour les agents IA | `releasit_a_confirmer`, `releasit_statistiques`, `releasit_diagnostic`, `releasit_suggestions`, `releasit_creer_offre_quantite` (avec confirmation) | Fait | `lib/axia/releasit-tools.ts` |
