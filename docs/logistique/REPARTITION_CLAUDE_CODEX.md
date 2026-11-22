# Répartition Claude Code / Codex

Lire d'abord les fichiers de ce dossier. Objectif : avancer en parallèle sans se marcher dessus.

## Règles communes

1. Ne jamais lancer `git add -A` : ajouter uniquement ses propres fichiers.
2. Ne jamais modifier un fichier possédé par l'autre outil. Besoin d'un changement : l'écrire dans la section « Demandes » ci-dessous.
3. Ne jamais pousser, migrer ou déployer sans accord explicite du propriétaire du projet.
4. Ne jamais lire ni copier `env`, `env.prod`, `env.download`, `.env*`.
5. Ne jamais tester sur la base Neon de production.
6. Avant de commiter : `npx tsc --noEmit` et `npm test`.
7. Textes en français, charte du design system, aucune donnée fictive présentée comme réelle.
8. **Aucune photo ni bannière** dans le dashboard, le Command Center, les espaces livreur et affilié, ni sur les pages de connexion et d'inscription.

## Propriété des fichiers

| Claude Code | Codex |
|---|---|
| `prisma/**` | `components/logistique/**` |
| `lib/logistique/**` (moteurs, services, contrats) | `app/(dashboard)/dashboard/logistique/**` (nouveaux écrans) |
| `app/api/logistique/**`, `app/api/admin/logistique/**` | `app/transporteur/**` (portail société) |
| `lib/permissions*.ts`, `proxy.ts`, `lib/auth.ts` | `app/transporteurs/**` (annuaire public) |
| `cloudflare/**`, `wrangler.jsonc` | `app/(admin)/admin/logistique/**` |
| Correctifs de sécurité de la phase 0 | `public/visuels/**` |
| `tests/logistique-*.test.ts` | Tests Playwright `tests/e2e/logistique-*` |

`lib/logistique/types.ts` est **le contrat** : Claude Code le publie, Codex le consomme sans le modifier.

## Ordre de travail

| Étape | Claude Code | Codex |
|---|---|---|
| Maintenant | Phase 0, puis modèle de données | Terminer les 23 images manquantes et commiter ses 20 fichiers en cours |
| Phases 2 à 3 | Onboarding et vérification (API) | Formulaires d'onboarding, écran de relecture admin |
| Phases 4 à 6 | Score, classement, tarifs | Cartes fournisseurs, comparateur, détail du prix |
| Phases 7 à 9 | Dispatch | Dashboard marchand, portail société, espace livreur |
| Phases 10 à 11 | Ingestion GPS, Durable Objects, ETA | Adaptateur MapLibre, carte live, page client |
| Phases 12 à 13 | Registre des crédits, règlements | Écrans crédits, gains, lots |
| Phases 14 à 19 | Jumeau, prévision, politiques | Tour de contrôle, simulation, visualisations |

## Message à donner à Codex

> Lis `docs/logistique/REPARTITION_CLAUDE_CODEX.md` et respecte strictement la colonne Codex. Termine d'abord les images référencées mais absentes dans `public/visuels` et stabilise tes fichiers en cours. Ensuite, attends la publication de `lib/logistique/types.ts` avant de construire les écrans logistiques. Ne touche ni à Prisma, ni aux API, ni aux fichiers d'environnement. Ne pousse pas, ne migre pas, ne déploie pas.

## Demandes entre outils

_Vide._
