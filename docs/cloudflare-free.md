# AXSO sur Workers Free et Neon

## Préproduction

1. Sélectionner Workers Free et une branche Neon de préproduction. Installer le projet avec Node 24 et `npm ci --legacy-peer-deps`. Exécuter `npm run check:cloudflare`.
2. Vérifier l’historique de migrations avec `npx prisma migrate status` sur la connexion directe à cette branche. Si Vercel utilisait uniquement `db push`, réconcilier son historique avant tout déploiement de migration. Exécuter `npx prisma migrate deploy` sur la branche de test. La migration `20261120160000_worker_passwords` active pgcrypto pour vérifier les empreintes bcrypt existantes.
3. Configurer les secrets du Worker dans Cloudflare. Utiliser la connexion Neon poolée sous TLS pour `DATABASE_URL`, la clé de session dans `AUTH_SECRET`, un secret de planification dans `CRON_SECRET`, et l’origine HTTPS du Worker dans `AUTH_URL`. Reprendre les variables des intégrations activées sur Vercel, dont le stockage de fichiers, les paiements et les e-mails. Utiliser leurs environnements de test en préproduction.
4. Définir `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_AXSO_DOMAIN` au build et au runtime. Pour workers.dev, laisser `NEXT_PUBLIC_SOUS_DOMAINES=0`. Les changements de valeurs publiques exigent une recompilation du client.
5. Exécuter `npm run build:cloudflare`, puis `npm run preview:cloudflare` pour tester localement. Placer les secrets de test dans `.dev.vars`, ignoré par Git. Publier avec `npx wrangler login` puis `npm run deploy:cloudflare`.
6. Tester la connexion marchand avec 2FA, une vente, sa livraison et l’accès client sur l’URL workers.dev. Mesurer le CPU et les dépassements de quota dans Workers Analytics. Toutes les boutiques partagent les quotas du compte. Neon et les intégrations externes conservent leurs propres conditions tarifaires.

## Domaines et bascule

Dans la zone Cloudflare de ton domaine, configurer un enregistrement DNS générique `*` proxifié, Universal SSL et une route Worker `*.axsoafrica.com/*` vers `axso-free`. Relier aussi le domaine racine. Vérifier les enregistrements spécifiques existants, qui ont priorité sur le wildcard. Configurer ensuite `NEXT_PUBLIC_SOUS_DOMAINES=1` et `NEXT_PUBLIC_AXSO_DOMAIN=axsoafrica.com` au build et au runtime. Les nouvelles boutiques utilisent automatiquement la même route.

Un domaine appartenant à un marchand utilise Cloudflare for SaaS. Configurer l’origine de secours et le routage des custom hostnames vers le Worker. Configurer `CF_SAAS_ZONE_ID`, `CF_SAAS_TARGET` et le secret `CF_SAAS_READ_TOKEN` (lecture seule). Avec en plus le secret `CF_SAAS_EDIT_TOKEN` (permission *Custom Hostnames : Edit*), AXSO enregistre et retire lui-même chaque hostname quand le marchand connecte ou retire son domaine ; sans lui, l’opérateur l’enregistre à la main dans le quota inclus. AXSO affiche les enregistrements DNS à créer et vérifie la preuve TXT de la boutique ainsi que le certificat actif. Sans enregistrement automatique, après suppression dans AXSO, retirer aussi le hostname dans Cloudflare pour libérer la place.

À la bascule, conserver les secrets de signature de production et vérifier les URL de webhook et de retour des paiements. Arrêter les crons Vercel avant de définir `AXSO_CRONS_ENABLED=1` dans le Worker. Les quatre horaires UTC sont déclarés dans `wrangler.jsonc`.

[Quotas Workers](https://developers.cloudflare.com/workers/platform/limits/) · [DNS générique](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/) · [Worker comme origine SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/)
