# Refonte de l’administration marchande AXSO

## Décision soumise à validation

Adopter le prototype pour l’espace marchand sous `/dashboard`. Le groupe `app/(admin)` dessert déjà les opérateurs de la plateforme. Les URL anglaises de la section 6 seront des chemins enfants du dashboard. Garder les liens français existants comme entrées compatibles, y compris leurs paramètres de filtre. La racine marchande accueillera la nouvelle page d’accueil. Prévoir une destination explicite pour la conversation AXIA et migrer les liens profonds `?axia=` avant de modifier cette racine.

## État du dépôt

Révision auditée `8e103ba`. Next.js 16.3.8 App Router, React 19.2.4 et TypeScript. Les pages serveur lisent Prisma/PostgreSQL ou appellent des services métier. Les composants client utilisent fetch, des hooks React et Zustand. Tailwind 4, CSS global, styles locaux, Lucide, Recharts et Sonner sont déjà installés. La langue vient du fournisseur I18nProvider et des dictionnaires serveur. Le layout lit la devise du tenant avec repli XAF. Conserver la devise effective sur chaque montant réel.

Le layout marchand valide la session, redirige les affiliés et transmet droits, palier, état de la caisse et boutique active. Les permissions sont définies dans `lib/permissions.ts` et résolues dans `lib/permissions-server.ts`. Le kiosque du caissier et les écrans plein cadre nécessitent une recette distincte.

Les scripts lancent les tests TypeScript avec tsx et le runner Node. Les intégrations exigent une base locale. Playwright est installé. Aucun script npm de lint ou de formatage déclaré. La CI GitHub Actions installe Node 20, génère Prisma, lance le build, les tests et un audit npm. Les étapes TypeScript et ESLint tolèrent les échecs. Vérifier les codes retour directement à chaque lot. Le build local du clone a généré Prisma puis échoué au téléchargement de Poppins. Le statut de référence des tests reste à établir sur le clone.

## Inventaire et correspondances

L’annexe ci-dessous répertorie les 110 pages marchandes suivies par Git. La colonne données recense les chemins API littéraux et modèles Prisma visibles dans la page et ses composants ou hooks importés. Les helpers serveur, les URL construites et les requêtes conditionnelles demandent une vérification par parcours. La colonne droits indique le filtrage de navigation visible dans Sidebar, par préfixe le plus spécifique. Elle ne constitue pas une preuve de contrôle serveur.

| Route actuelle | Fichier | Destination proposée | Statut | Données repérées | Accès de navigation |
|---|---|---|---|---|---|
| /dashboard/abonnement | app/(dashboard)/dashboard/abonnement/page.tsx | /dashboard/settings/plan | existe, adapter | /api/abonnement/essai, /api/abonnement/etat, Prisma tenant | finance |
| /dashboard/accueil | app/(dashboard)/dashboard/accueil/page.tsx | /dashboard | existe, adapter | /api/avis-plateforme, Prisma commande, Prisma analytics, Prisma produit, Prisma tenant, Prisma client, Prisma programmeAffiliation, Prisma avisPlateforme | Session marchand |
| /dashboard/affiliation | app/(dashboard)/dashboard/affiliation/page.tsx | /dashboard/affiliation | existe, conserver | /api/affiliation/programmes, /api/affiliation/affilies, /api/affiliation/commissions | marketing |
| /dashboard/agents | app/(dashboard)/dashboard/agents/page.tsx | /dashboard/agents | existe, conserver | /api/ai/orchestrator, /api/ai/universal | Session marchand |
| /dashboard/analytics | app/(dashboard)/dashboard/analytics/page.tsx | /dashboard/analytics | existe, adapter | /api/abonnement/etat, /api/abonnement/essai, Prisma commande, Prisma analytics, Prisma produit, Prisma avis, Prisma tenant | produits |
| /dashboard/automation | app/(dashboard)/dashboard/automation/page.tsx | /dashboard/automation | existe, conserver | /api/automation | Session marchand |
| /dashboard/avis | app/(dashboard)/dashboard/avis/page.tsx | /dashboard/avis | existe, conserver | Prisma tenant, Prisma avis | clients |
| /dashboard/axia/journal | app/(dashboard)/dashboard/axia/journal/page.tsx | /dashboard/axia/journal | existe, conserver | /api/agent-decisions | Session marchand |
| /dashboard/axia | app/(dashboard)/dashboard/axia/page.tsx | /dashboard/axia | existe, conserver | /api/ai/axia | Session marchand |
| /dashboard/boutique | app/(dashboard)/dashboard/boutique/page.tsx | /dashboard/boutique | existe, conserver | /api/tenants/moi, /api/livraison/regles, /api/boutiques, /api/boutiques/switch, /api/tenants, /api/annonces/${encodeURIComponent(id)}, /api/annonces, /api/affiliation/ouverture | boutique |
| /dashboard/builder | app/(dashboard)/dashboard/builder/page.tsx | /dashboard/online_store/themes/[id]/editor | existe, adapter | /api/tenants/moi-complet, /api/tenants | boutique |
| /dashboard/campagnes | app/(dashboard)/dashboard/campagnes/page.tsx | /dashboard/growth/campaigns | existe, adapter | /api/popups, /api/automation, /api/badges | marketing |
| /dashboard/chatbot | app/(dashboard)/dashboard/chatbot/page.tsx | /dashboard/chatbot | existe, conserver | /api/chatbot | Session marchand |
| /dashboard/clients | app/(dashboard)/dashboard/clients/page.tsx | /dashboard/customers | existe, adapter | Prisma tenant, Prisma client, Prisma commande | clients |
| /dashboard/commandes/[id] | app/(dashboard)/dashboard/commandes/[id]/page.tsx | /dashboard/orders/[id] | existe, adapter | /api/commandes/${commandeId}/statut, /api/commandes/${commandeId}/assigner, /api/commandes/${commandeId}/livraison-digitale, Prisma commande, Prisma livreur, Prisma livraisonDigitale, Prisma telechargement, Prisma accesFormation, Prisma cleLicence | commandes |
| /dashboard/commandes | app/(dashboard)/dashboard/commandes/page.tsx | /dashboard/orders | existe, adapter | /api/commandes/export, Prisma tenant, Prisma commande | commandes |
| /dashboard/connecteurs | app/(dashboard)/dashboard/connecteurs/page.tsx | /dashboard/connecteurs | existe, conserver | Chargement délégué ou vue locale | boutique |
| /dashboard/controle-ia | app/(dashboard)/dashboard/controle-ia/page.tsx | /dashboard/controle-ia | existe, conserver | /api/controle-ia, /api/axia/propositions, /api/controle-ia/automatisations, /api/controle-ia/services, /api/controle-ia/builder | palier1 |
| /dashboard/entrepots | app/(dashboard)/dashboard/entrepots/page.tsx | /dashboard/settings/locations | existe, adapter | Chargement délégué ou vue locale | produits |
| /dashboard/factures | app/(dashboard)/dashboard/factures/page.tsx | /dashboard/factures | existe, conserver | Chargement délégué ou vue locale | finance |
| /dashboard/feeds | app/(dashboard)/dashboard/feeds/page.tsx | /dashboard/feeds | existe, conserver | /api/feed/google, /api/feed/meta, /api/feed/tiktok, /api/tenants/moi | boutique |
| /dashboard/fichiers | app/(dashboard)/dashboard/fichiers/page.tsx | /dashboard/content/files | existe, adapter | /api/fichiers | boutique |
| /dashboard/gamification | app/(dashboard)/dashboard/gamification/page.tsx | /dashboard/gamification | existe, conserver | /api/badges | Session marchand |
| /dashboard/livraison | app/(dashboard)/dashboard/livraison/page.tsx | /dashboard/settings/shipping | existe, adapter | Chargement délégué ou vue locale | Session marchand |
| /dashboard/livreurs | app/(dashboard)/dashboard/livreurs/page.tsx | /dashboard/livreurs | existe, conserver | Chargement délégué ou vue locale | commandes |
| /dashboard/logistique/encaissements | app/(dashboard)/dashboard/logistique/encaissements/page.tsx | /dashboard/logistique/encaissements | existe, conserver | /api/commandes/remise-cod, Prisma commande, Prisma gainLivreur | finance |
| /dashboard/logistique/entrepots | app/(dashboard)/dashboard/logistique/entrepots/page.tsx | /dashboard/logistique/entrepots | existe, conserver | /api/entrepots | Session marchand |
| /dashboard/logistique/livraison | app/(dashboard)/dashboard/logistique/livraison/page.tsx | /dashboard/logistique/livraison | existe, conserver | Chargement délégué ou vue locale | Session marchand |
| /dashboard/logistique/livreurs | app/(dashboard)/dashboard/logistique/livreurs/page.tsx | /dashboard/logistique/livreurs | existe, conserver | Chargement délégué ou vue locale | Session marchand |
| /dashboard/logistique | app/(dashboard)/dashboard/logistique/page.tsx | /dashboard/logistique | existe, conserver | /api/livraison/regles, /api/commandes, /api/tenants/moi, /api/commandes/${commandeId}/statut, /api/livreurs, /api/livreurs/plateforme, /api/livreurs/${livreurId}/remuneration, /api/retours, /api/factures, /api/produits, /api/pos/scan, /api/commandes/pos-creer, Prisma commande, Prisma livreur, Prisma retourRMA, Prisma facture | Session marchand |
| /dashboard/logistique/retours | app/(dashboard)/dashboard/logistique/retours/page.tsx | /dashboard/logistique/retours | existe, conserver | Chargement délégué ou vue locale | Session marchand |
| /dashboard/logistique/transporteurs | app/(dashboard)/dashboard/logistique/transporteurs/page.tsx | /dashboard/logistique/transporteurs | existe, conserver | /api/transporteurs | Session marchand |
| /dashboard/magic-import | app/(dashboard)/dashboard/magic-import/page.tsx | /dashboard/magic-import | existe, conserver | /api/magic-import | Session marchand |
| /dashboard/marketing/codes-promo | app/(dashboard)/dashboard/marketing/codes-promo/page.tsx | /dashboard/discounts | existe, adapter | /api/codes-promo, /api/codes-promo/${id} | marketing, palier1 |
| /dashboard/marketing/email | app/(dashboard)/dashboard/marketing/email/page.tsx | /dashboard/marketing/email | existe, conserver | /api/email, /api/codes-promo, /api/ai/chat | marketing, palier1 |
| /dashboard/marketing | app/(dashboard)/dashboard/marketing/page.tsx | /dashboard/growth | existe, adapter | Prisma tenant, Prisma codePromo, Prisma client | marketing, palier1 |
| /dashboard/marketing/tracking | app/(dashboard)/dashboard/marketing/tracking/page.tsx | /dashboard/marketing/tracking | existe, conserver | /api/tenants, /api/tenants/moi-complet | marketing, palier1 |
| /dashboard/medias | app/(dashboard)/dashboard/medias/page.tsx | /dashboard/medias | existe, conserver | /api/medias | Session marchand |
| /dashboard/messages | app/(dashboard)/dashboard/messages/page.tsx | /dashboard/messages | existe, conserver | /api/reseau/posts/${postId}/comment, /api/reseau/posts/${postId}/comment${lastId, /api/reseau/posts/${post.id}/reaction, /api/reseau/posts/${post.id}/vote, /api/ai/chat, /api/reseau/posts, /api/reseau/search, /api/reseau/feed${qs.length, /api/reseau/leaderboard, /api/tenants/moi | Session marchand |
| /dashboard/objectifs | app/(dashboard)/dashboard/objectifs/page.tsx | /dashboard/objectifs | existe, conserver | /api/objectifs, /api/objectifs/${id} | produits |
| /dashboard | app/(dashboard)/dashboard/page.tsx | /dashboard/axia | existe, adapter | /api/tenants/moi, /api/ai/axia/voix, /api/ai/axia, /api/compte, /api/axia/conversations, /api/axia/conversations/${id}, /api/notifications-marchand, /api/push, /api/boutiques/switch, /api/boutiques | palier1 |
| /dashboard/paiements | app/(dashboard)/dashboard/paiements/page.tsx | /dashboard/settings/payments | existe, adapter | Prisma tenant, Prisma commande, Prisma wallet, Prisma commission, Prisma retrait | finance |
| /dashboard/parametres/domaine | app/(dashboard)/dashboard/parametres/domaine/page.tsx | /dashboard/settings/domains | existe, adapter | /api/domaine${verifier, /api/domaine | Session marchand |
| /dashboard/parametres/equipe | app/(dashboard)/dashboard/parametres/equipe/page.tsx | /dashboard/settings/users | existe, adapter | /api/equipe/liste, /api/equipe, /api/equipe/${id}, /api/equipe/${m.id} | Session marchand |
| /dashboard/parametres/notifications | app/(dashboard)/dashboard/parametres/notifications/page.tsx | /dashboard/settings/notifications | existe, adapter | /api/tenants/moi-complet, /api/tenants | Session marchand |
| /dashboard/parametres | app/(dashboard)/dashboard/parametres/page.tsx | /dashboard/settings/general | existe, adapter | /api/tenants/moi-complet, /api/tenants, /api/tenant/whatsapp | Session marchand |
| /dashboard/pos/achats | app/(dashboard)/dashboard/pos/achats/page.tsx | /dashboard/purchase_orders | existe, adapter | /api/pos/achats/${bon.id}, /api/pos/achats, /api/pos/achats/${id}, /api/pos/achats/${id}/email, /api/pos/achats${statut, /api/pos/articles, /api/pos/achats/fournisseurs, /api/pos/reappro | pos |
| /dashboard/pos/analytics | app/(dashboard)/dashboard/pos/analytics/page.tsx | /dashboard/pos/analytics | existe, conserver | /api/pos/analytics, /api/pos/articles, /api/pos/alertes | pos |
| /dashboard/pos/audit | app/(dashboard)/dashboard/pos/audit/page.tsx | /dashboard/pos/audit | existe, conserver | /api/pos/audit/integrite, /api/pos/audit | pos |
| /dashboard/pos/caisse | app/(dashboard)/dashboard/pos/caisse/page.tsx | /dashboard/pos/caisse | existe, conserver | /api/produits, /api/pos/scan, /api/commandes/pos-creer, /api/pos/reglages, /api/pos/caisses, /api/pos/scanner/signal, /api/pos/ventes/calculer, /api/pos/scanner/scans, /api/pos/flux, /api/pos/articles, /api/pos/ventes/suspendus, /api/pos/ventes/suspendus/${p.id}, /api/pos/avoirs, /api/pos/suggestions, /api/pos/produits, /api/pos/ventes/${commandeId}/annuler, /api/pos/clients, /api/pos/scanner/appairage, /api/pos/clients/${encodeURIComponent(clientId)}, /api/pos/fidelite/convertir, /api/pos/fiche, /api/pos/analytics/article | pos |
| /dashboard/pos/charges | app/(dashboard)/dashboard/pos/charges/page.tsx | /dashboard/pos/charges | existe, conserver | /api/pos/charges, /api/pos/charges/${id} | finance |
| /dashboard/pos/comptabilite | app/(dashboard)/dashboard/pos/comptabilite/page.tsx | /dashboard/pos/comptabilite | existe, conserver | /api/pos/comptabilite | finance |
| /dashboard/pos/credit | app/(dashboard)/dashboard/pos/credit/page.tsx | /dashboard/pos/credit | existe, conserver | /api/pos/credit${clientId, /api/pos/credit, /api/pos/clients/${ouvert.id}, /api/pos/credit/remboursements, /api/pos/clients | pos |
| /dashboard/pos/demarrage | app/(dashboard)/dashboard/pos/demarrage/page.tsx | /dashboard/pos/demarrage | existe, conserver | /api/pos/demarrage | pos |
| /dashboard/pos/fiche | app/(dashboard)/dashboard/pos/fiche/page.tsx | /dashboard/pos/fiche | existe, conserver | /api/pos/fiche, /api/pos/analytics/article, /api/pos/articles, /api/pos/scanner/scans, /api/pos/flux | pos |
| /dashboard/pos/fidelite | app/(dashboard)/dashboard/pos/fidelite/page.tsx | /dashboard/pos/fidelite | existe, conserver | /api/pos/fidelite, /api/pos/fidelite/ajustement | pos |
| /dashboard/pos/import | app/(dashboard)/dashboard/pos/import/page.tsx | /dashboard/pos/import | existe, conserver | /api/pos/import, /api/pos/export | pos |
| /dashboard/pos/inventaire | app/(dashboard)/dashboard/pos/inventaire/page.tsx | /dashboard/pos/inventaire | existe, conserver | /api/pos/articles, /api/pos/inventaire, /api/pos/inventaire/${id}, /api/pos/inventaire/${id}/comptages, /api/pos/scanner/scans, /api/pos/flux | pos |
| /dashboard/pos/journal | app/(dashboard)/dashboard/pos/journal/page.tsx | /dashboard/pos/journal | existe, conserver | /api/pos/magasins, /api/pos/journal, /api/pos/articles, /api/pos/alertes | pos |
| /dashboard/pos | app/(dashboard)/dashboard/pos/page.tsx | /dashboard/pos | existe, conserver | Chargement délégué ou vue locale | Session marchand |
| /dashboard/pos/pilotage | app/(dashboard)/dashboard/pos/pilotage/page.tsx | /dashboard/pos/pilotage | existe, conserver | /api/pos/tableau-de-bord, /api/pos/flux, /api/pos/articles, /api/pos/alertes | pos |
| /dashboard/pos/promotions | app/(dashboard)/dashboard/pos/promotions/page.tsx | /dashboard/pos/promotions | existe, conserver | /api/pos/promotions, /api/pos/reglages, /api/pos/promotions/${p.id}, /api/pos/promotions/${aSupprimer.id}, /api/pos/articles, /api/pos/promotions/${promotion.id} | pos |
| /dashboard/pos/rapprochement | app/(dashboard)/dashboard/pos/rapprochement/page.tsx | /dashboard/pos/rapprochement | existe, conserver | /api/pos/rapprochement | finance |
| /dashboard/pos/receptions | app/(dashboard)/dashboard/pos/receptions/page.tsx | /dashboard/pos/receptions | existe, conserver | /api/pos/receptions${bonId, /api/pos/achats, /api/pos/scan, /api/pos/receptions, /api/pos/scanner/scans, /api/pos/flux, /api/pos/articles | pos |
| /dashboard/pos/reglages | app/(dashboard)/dashboard/pos/reglages/page.tsx | /dashboard/pos/reglages | existe, conserver | /api/pos/metriques, /api/pos/reglages, /api/pos/scanner/appareils${portee, /api/pos/scanner/appareils/${edition.id}, /api/pos/scanner/appareils/${aRevoquer.id}, /api/pos/scanner/appairage, /api/pos/flux, /api/pos/magasins, /api/pos/magasins/${saisie.id}, /api/pos/caisses/${saisie.id}, /api/pos/caisses, /api/pos/magasins/${m.id}, /api/pos/caisses/${c.id}, /api/pos/demarrage/equipe | pos |
| /dashboard/pos/retours | app/(dashboard)/dashboard/pos/retours/page.tsx | /dashboard/pos/retours | existe, conserver | /api/pos/reglages, /api/pos/retours/ventes, /api/pos/retours, /api/pos/articles, /api/pos/ventes/calculer, /api/pos/scanner/scans, /api/pos/flux | pos |
| /dashboard/pos/session | app/(dashboard)/dashboard/pos/session/page.tsx | /dashboard/pos/session | existe, conserver | /api/pos/reglages, /api/pos/sessions, /api/pos/caisses, /api/pos/sessions/${ouverte.id}, /api/pos/mouvements-caisse, /api/pos/sessions/${sessionId}, /api/pos/flux | pos |
| /dashboard/pos/stock | app/(dashboard)/dashboard/pos/stock/page.tsx | /dashboard/products/inventory | existe, adapter | /api/pos/stock, /api/pos/fiche, /api/pos/analytics/article, /api/pos/articles, /api/pos/scanner/scans, /api/pos/flux | pos |
| /dashboard/pos/supervision | app/(dashboard)/dashboard/pos/supervision/page.tsx | /dashboard/pos/supervision | existe, conserver | /api/pos/supervision, /api/pos/flux, /api/pos/scanner/appareils${portee, /api/pos/scanner/appareils/${edition.id}, /api/pos/scanner/appareils/${aRevoquer.id}, /api/pos/scanner/appairage, /api/pos/articles, /api/pos/alertes | pos |
| /dashboard/pos/tracabilite | app/(dashboard)/dashboard/pos/tracabilite/page.tsx | /dashboard/pos/tracabilite | existe, conserver | /api/pos/lots, /api/pos/lots/${action.lot.id}, /api/pos/series, /api/pos/series/${id}, /api/pos/stock, /api/pos/fiche, /api/pos/analytics/article, /api/pos/articles, /api/pos/scanner/scans, /api/pos/flux | pos |
| /dashboard/pos/transferts | app/(dashboard)/dashboard/pos/transferts/page.tsx | /dashboard/transfers | existe, adapter | /api/pos/transferts, /api/pos/transferts/${id}, /api/pos/articles, /api/pos/scanner/scans, /api/pos/flux | pos |
| /dashboard/produits/[id]/apprenants | app/(dashboard)/dashboard/produits/[id]/apprenants/page.tsx | /dashboard/produits/[id]/apprenants | existe, conserver | /api/formations/${produitId}/devoirs/${rendu.id}, /api/formations/${produitId}/certificats/${c.id}, Prisma produit, Prisma accesFormation, Prisma commande, Prisma progressionLecon, Prisma tentativeQuiz, Prisma renduDevoir, Prisma certificat | produits |
| /dashboard/produits/[id] | app/(dashboard)/dashboard/produits/[id]/page.tsx | /dashboard/products/[id] | existe, adapter | /api/tenants/moi, /api/produits/${id}, /api/produits/${id}/variantes, /api/ai/description, /api/variantesPrix, /api/variantesPrix/${editId}, /api/variantesPrix/${id}, /api/variantesPrix/${v.id}, /api/licences/${produitId}/cles, /api/licences/${produitId}/cles/${cleId}, /api/formations/${produitId}/chapitres/${chapitreId}/lecons, /api/formations/${produitId}/chapitres/${chapitre.id}, /api/formations/${produitId}/chapitres, /api/formations/${produitId}/chapitres/${id}, /api/formations/${produitId}, /api/produits/digitaux/${produitId}, /api/produits/digitaux/${produitId}/fichiers, /api/produits/digitaux/${produitId}/fichiers/${id}, /api/produits/digitaux/${produitId}/mise-a-jour, /api/produits/digitaux/${produitId}/nouvelle-version, /api/produits/${produitId}, /api/ai/faq, /api/upload/client, /api/categories | produits |
| /dashboard/produits/categories | app/(dashboard)/dashboard/produits/categories/page.tsx | /dashboard/collections | existe, adapter | /api/categories, /api/categories/${c.id}, /api/categories/${categorie.id} | produits |
| /dashboard/produits/creer/bundle | app/(dashboard)/dashboard/produits/creer/bundle/page.tsx | /dashboard/produits/creer/bundle | existe, conserver | /api/produits, /api/produits/digitaux, /api/produits/digitaux/${id}/elements, /api/produits/digitaux/${id}, /api/produits/digitaux/${produitId} | produits |
| /dashboard/produits/creer/fichier | app/(dashboard)/dashboard/produits/creer/fichier/page.tsx | /dashboard/produits/creer/fichier | existe, conserver | /api/produits/digitaux, /api/produits/digitaux/${id}, /api/produits/digitaux/${id}/fichiers, /api/produits/digitaux/${produitId} | produits |
| /dashboard/produits/creer/formation | app/(dashboard)/dashboard/produits/creer/formation/page.tsx | /dashboard/produits/creer/formation | existe, conserver | /api/produits/digitaux, /api/produits/digitaux/${d.produit, /api/produits/digitaux/${produitId} | produits |
| /dashboard/produits/creer/licence | app/(dashboard)/dashboard/produits/creer/licence/page.tsx | /dashboard/produits/creer/licence | existe, conserver | /api/produits/digitaux, /api/produits/digitaux/${produitId}, /api/licences/${produitId}/cles, /api/licences/${produitId}/cles/${cleId} | produits |
| /dashboard/produits/creer | app/(dashboard)/dashboard/produits/creer/page.tsx | /dashboard/produits/creer | existe, conserver | Chargement délégué ou vue locale | produits |
| /dashboard/produits/digital/nouveau | app/(dashboard)/dashboard/produits/digital/nouveau/page.tsx | /dashboard/produits/digital/nouveau | existe, conserver | Chargement délégué ou vue locale | produits |
| /dashboard/produits/digital | app/(dashboard)/dashboard/produits/digital/page.tsx | /dashboard/produits/digital | existe, conserver | /api/produits-digitaux, /api/livraison-digitale | produits |
| /dashboard/produits/imports-ia | app/(dashboard)/dashboard/produits/imports-ia/page.tsx | /dashboard/produits/imports-ia | existe, conserver | /api/produits/imports-ia | produits |
| /dashboard/produits/live/bootcamps/[id] | app/(dashboard)/dashboard/produits/live/bootcamps/[id]/page.tsx | /dashboard/produits/live/bootcamps/[id] | existe, conserver | /api/live/evenements, /api/live/bootcamps, /api/live/evenements/${id}, /api/live/bootcamps/${id}, /api/live/communaute/${bc.produitId}, /api/live/communaute/${produitId} | produits |
| /dashboard/produits/live/evenements/[id] | app/(dashboard)/dashboard/produits/live/evenements/[id]/page.tsx | /dashboard/produits/live/evenements/[id] | existe, conserver | /api/live/evenements, /api/live/bootcamps, /api/live/evenements/${id}, /api/live/bootcamps/${id}, /api/live/communaute/${bc.produitId}, /api/live/communaute/${produitId} | produits |
| /dashboard/produits/live | app/(dashboard)/dashboard/produits/live/page.tsx | /dashboard/produits/live | existe, conserver | /api/live/evenements, /api/live/bootcamps, /api/live/evenements/${id}, /api/live/bootcamps/${id}, /api/live/communaute/${bc.produitId}, /api/live/communaute/${produitId} | produits |
| /dashboard/produits/nouveau | app/(dashboard)/dashboard/produits/nouveau/page.tsx | /dashboard/products/new | existe, adapter | /api/ai/description, /api/produits, /api/categories, /api/boutiques, /api/boutiques/switch | produits |
| /dashboard/produits | app/(dashboard)/dashboard/produits/page.tsx | /dashboard/products | existe, adapter | /api/produits/importer, Prisma tenant, Prisma produit | produits |
| /dashboard/produits/studio/[id] | app/(dashboard)/dashboard/produits/studio/[id]/page.tsx | /dashboard/produits/studio/[id] | existe, conserver | /api/academie/studio/${id}, /api/academie/studio/taches | produits |
| /dashboard/produits/studio | app/(dashboard)/dashboard/produits/studio/page.tsx | /dashboard/produits/studio | existe, conserver | /api/academie/studio | produits |
| /dashboard/profil | app/(dashboard)/dashboard/profil/page.tsx | /dashboard/profil | existe, conserver | /api/compte, /api/boutiques, /api/compte/mot-de-passe, /api/upload/client, /api/boutiques/switch | Session marchand |
| /dashboard/publicite | app/(dashboard)/dashboard/publicite/page.tsx | /dashboard/publicite | existe, conserver | /api/campagnes, /api/ai/universal | Session marchand |
| /dashboard/rapports | app/(dashboard)/dashboard/rapports/page.tsx | /dashboard/analytics/reports | existe, adapter | Prisma tenant, Prisma commande, Prisma client, Prisma ligneCommande | produits |
| /dashboard/retours | app/(dashboard)/dashboard/retours/page.tsx | /dashboard/retours | existe, conserver | Chargement délégué ou vue locale | commandes |
| /dashboard/revenus/commissions | app/(dashboard)/dashboard/revenus/commissions/page.tsx | /dashboard/revenus/commissions | existe, conserver | Prisma tenant, Prisma commission | finance |
| /dashboard/revenus | app/(dashboard)/dashboard/revenus/page.tsx | /dashboard/revenus | existe, conserver | Prisma tenant, Prisma commande, Prisma commission | finance |
| /dashboard/scheduler | app/(dashboard)/dashboard/scheduler/page.tsx | /dashboard/scheduler | existe, conserver | /api/posts, /api/ai/universal | Session marchand |
| /dashboard/sms | app/(dashboard)/dashboard/sms/page.tsx | /dashboard/sms | existe, conserver | /api/email, /api/sms, /api/ai/universal | Session marchand |
| /dashboard/sourcing/fournisseurs/[id] | app/(dashboard)/dashboard/sourcing/fournisseurs/[id]/page.tsx | /dashboard/sourcing/fournisseurs/[id] | existe, conserver | /api/fournisseurs/${dossier.id}, /api/fournisseurs/${id}, /api/fournisseurs/ia, /api/fournisseurs/${initial.id}, /api/fournisseurs, /api/fournisseurs/${id}/offres, /api/fournisseurs/${id}/documents, /api/fournisseurs/${fiche.dossier.id}/offres, /api/fournisseurs/${fiche.dossier.id}/documents, /api/fournisseurs/${fiche.dossier.id}/audits, /api/fournisseurs/${dossier.id}/echantillons, /api/fournisseurs/${fiche.dossier.id}/evaluations | produits, palier2 |
| /dashboard/sourcing/fournisseurs/devis | app/(dashboard)/dashboard/sourcing/fournisseurs/devis/page.tsx | /dashboard/sourcing/fournisseurs/devis | existe, conserver | /api/fournisseurs/devis, /api/fournisseurs | produits, palier2 |
| /dashboard/sourcing/fournisseurs | app/(dashboard)/dashboard/sourcing/fournisseurs/page.tsx | /dashboard/sourcing/fournisseurs | existe, conserver | /api/fournisseurs/intelligence, /api/produits, /api/fournisseurs/ia, /api/fournisseurs/${initial.id}, /api/fournisseurs, /api/fournisseurs/${id}/offres, /api/fournisseurs/${id}/documents | produits, palier2 |
| /dashboard/sourcing | app/(dashboard)/dashboard/sourcing/page.tsx | /dashboard/sourcing | existe, conserver | /api/sourcing/assistant, /api/sourcing/produits, /api/sourcing/produits/${id}, /api/fournisseurs/${detail.data.source.fournisseurId}, /api/fournisseurs, /api/sourcing/produits/${d.source.id}, /api/sourcing/produits/${d.source.id}/publier, /api/sourcing/reglages, /api/sourcing/tableau-de-bord, /api/sourcing/commandes, /api/dropshipping/commandes-fournisseur, /api/sourcing/expeditions, /api/sourcing/routage, /api/sourcing/stocks | produits, palier2 |
| /dashboard/sourcing/reglages | app/(dashboard)/dashboard/sourcing/reglages/page.tsx | /dashboard/sourcing/reglages | existe, conserver | /api/sourcing/reglages | produits, palier2 |
| /dashboard/studio | app/(dashboard)/dashboard/studio/page.tsx | /dashboard/studio | existe, conserver | /api/ai/video, /api/ai/voix-off, /api/ai/universal | Session marchand |
| /dashboard/support | app/(dashboard)/dashboard/support/page.tsx | /dashboard/support | existe, conserver | Chargement délégué ou vue locale | Session marchand |
| /dashboard/themes/creer | app/(dashboard)/dashboard/themes/creer/page.tsx | /dashboard/themes/creer | existe, conserver | /api/themes, /api/tenants/moi, /api/produits, /api/themes/provisionner, /api/themes/importer, /api/tenants, /api/preview-theme | boutique |
| /dashboard/themes | app/(dashboard)/dashboard/themes/page.tsx | /dashboard/online_store | existe, adapter | /api/themes, /api/tenants/moi, /api/produits, /api/tenants, /api/themes/provisionner, /api/themes/${id}, /api/preview-theme | boutique |
| /dashboard/transporteurs | app/(dashboard)/dashboard/transporteurs/page.tsx | /dashboard/transporteurs | existe, conserver | Chargement délégué ou vue locale | commandes |
| /dashboard/veille | app/(dashboard)/dashboard/veille/page.tsx | /dashboard/veille | existe, conserver | /api/veille, /api/ai/chat | Session marchand |
| /dashboard/wallet | app/(dashboard)/dashboard/wallet/page.tsx | /dashboard/wallet | existe, conserver | /api/wallet, /api/wallet/retrait, /api/boutiques/switch, /api/boutiques | finance |
| /dashboard/whatsapp | app/(dashboard)/dashboard/whatsapp/page.tsx | /dashboard/channels/whatsapp | existe, adapter | /api/connecteurs/whatsapp, /api/connecteurs/whatsapp-genuka, /api/messages/whatsapp, /api/tenants/moi, /api/messages/whatsapp/envoyer, /api/commandes/${commandeId}/statut, /api/abonnement/etat, /api/abonnement/essai | clients |

## Vues à créer ou à fusionner

Sous le préfixe marchand, compléter les familles suivantes. Un écran manquant peut s’appuyer sur une API existante. Vérifier portée tenant, champs, pagination et possibilité d’écriture avant branchement.

| Cible section 6 | Source ou action proposée |
|---|---|
| draft_orders, draft_orders/new, checkouts | Créer les vues et vérifier les contrats de brouillon et de relance avant toute mutation. |
| collections/[id], gift_cards | Qualifier le lien entre catégories et collections. Prévoir une fixture de carte-cadeau en recette. |
| customers/[id], customers/segments, companies | Réutiliser les données clients. Valider la portée des segments POS avant fusion. Créer la vue entreprises. |
| growth/attribution, growth/autopilot | Relier rapports et objectifs existants aux métriques disponibles. Afficher les données manquantes en état indisponible. |
| discounts/new, discounts/[id] | Extraire les formulaires du gestionnaire de codes promo dans des vues adressables. |
| content/metaobjects, content/menus, content/articles | Évaluer les données du constructeur pour les menus. Préparer des fixtures typées pour les définitions et articles manquants. |
| markets, markets/catalogs, markets/rollouts | Créer les trois vues. Qualifier la distinction entre marchés, pays de livraison et variantes du constructeur. |
| analytics/reports/[id], analytics/live | Donner une URL aux rapports. Vérifier horodatage et fraîcheur des mesures disponibles pour la vue en direct. |
| online_store/pages, online_store/preferences | Répartir les contrôles du constructeur et de Ma boutique. |
| channels/agentic, channels/social, apps/[handle], apps/cod/{fraud,plans} | Qualifier les contrôles IA, les connecteurs, le suivi publicitaire et les encaissements COD. Un encaissement à la livraison et une application avec abonnement exigent des contrats distincts. |
| settings | Compléter les sections billing, checkout, customer_accounts, taxes, apps, channels, customer_events, metafields, languages, customer_privacy, policies. Préserver les réglages existants sous leurs liens directs. |

Les fonctions propres à AXSO comprennent caisse, sourcing, affiliation, produits numériques, formation, diffusion en direct et portefeuille. Les conserver dans des groupes métier accessibles aux mêmes rôles. Prévoir des fixtures de démonstration isolées pour les ressources sans contrat identifié. Les données de la boutique affichent un état vide ou indisponible en production.

## Composants

[Inventaire des 279 fichiers de composants](COMPONENTS.md). Les usages sont le nombre de fichiers TS/TSX/JS/JSX suivis important directement le module. Un fichier peut exporter plusieurs symboles. Un zéro demande une recherche des appels indirects avant toute suppression. Les composants des vitrines et du back-office plateforme gardent leur présentation.

## Risques et recette

- Tester propriétaire, équipier en lecture seule et caissier avec deux boutiques. Vérifier URL directe, recherche et changement de boutique.
- Conserver les requêtes serveur et un seul montage du constructeur pour protéger l’enregistrement automatique. Tester navigation arrière, rechargement et changements non enregistrés.
- Vérifier en français et anglais les montants, le fuseau et les longues chaînes. Auto-héberger Inter avec licence pour rendre le build reproductible.
- Charger les graphiques lourds sur les écrans concernés. Comparer prototype et application à 360, 820, 1040 et 1440 px. Tester clavier, focus restauré et préférence de mouvement réduit.
- Isoler les tokens au layout marchand pour préserver vitrines et SEO. Vérifier le manifeste PWA et les caches hors ligne par tenant. Une écriture financière hors ligne nécessite un mécanisme métier idempotent existant.
- Les trois fichiers de la première passe visuelle précèdent ce plan. Le lot 2 remplacera les valeurs provisoires par les tokens du cahier des charges.

## Lots et estimation

Estimations en jours-personne, à recalibrer après la première liste connectée.

| Lot | Livrable vérifiable | Charge |
|---|---|---|
| 1 | Prototype contrôlé et audit à valider | 1–2 |
| 2 | Tokens CSS/TS, Inter locale, icônes et illustrations | 2–3 |
| 3 | Primitives, formulaires et galerie interne protégée | 3–5 |
| 4 | Table, filtres URL, sélection, métriques et graphiques | 4–6 |
| 5 | Shell, recherche, AXIA, navigation mobile et paramètres | 4–6 |
| 6 | Accueil avec compteurs de la boutique | 2–3 |
| 7 | Commandes, fiches, brouillons et paniers | 3–5 |
| 8 | Catalogue, collections, stock, achats et transferts | 4–7 |
| 9 | Clients, segments et entreprises | 2–4 |
| 10 | Analyses, rapports et vue en direct | 3–5 |
| 11 | Paramètres et 19 sections | 4–7 |
| 12 | Croissance, attribution et réductions | 3–5 |
| 13 | Contenu et marchés | 3–5 |
| 14 | Canaux et applications | 4–7 |
| 15 | Accessibilité, tests de parcours, hors ligne et performance | 3–5 |

Chaque lot comprend les tests de comportement concernés, les captures comparatives et la vérification des routes historiques. Les actions sensibles d’AXIA demandent confirmation dans le parcours existant.

## Organisation proposée

- `components/dashboard/design-system/{tokens,icons,illustrations,components,layout}` pour les primitives partagées.
- `components/dashboard/features/{home,orders,products,customers,growth,discounts,content,markets,analytics,channels,apps,settings,axia,search}` pour les vues métier.
- `app/(dashboard)/dashboard/` pour les entrées de routes, layouts et états. Pour la galerie interne, employer le segment Next.js encodé `%5Fui` afin que l’URL expose `_ui`.
- `lib/i18n`, `lib/utils`, `hooks` et `store` pour les services et conventions existants. `tests/fixtures/admin` pour les jeux de recette.
- `reference/axso-admin-prototype.html` pour les comparaisons visuelles. Le fichier de référence reprend le bloc HTML complet de l’annexe A.
