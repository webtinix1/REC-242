# REC 242 : site, espace membre et back-office

Tu développes la plateforme web de REC 242 (Réseau des Entrepreneurs Congolais), une association d'entrepreneurs basée à Brazzaville. Le maître d'œuvre est Webtinix (contact@webtinix.com). Le client a validé une maquette complète, la « direction B, Le Cercle ». Ton travail est de la transformer en application réelle, sans rien réinventer.

## Avant d'écrire du code

Lis dans cet ordre :

1. `docs/01-projet.md` : le contexte, le périmètre et les décisions déjà prises.
2. `docs/02-architecture.md` : la stack et l'organisation du code.
3. `docs/10-plan-de-developpement.md` : l'ordre des lots. Travaille lot par lot, jamais plusieurs à la fois.
4. Pour le lot en cours, les documents qu'il cite : modèle de données, règles métier, écrans, e-mails.

La maquette est la référence visuelle et fonctionnelle. Elle tourne en local : `maquette/index.html` (aucun serveur nécessaire). Chaque écran existe aussi en capture dans `captures/`, sur ordinateur (1440 px) et sur mobile (390 px).

## Stack

- Payload 3 dans une application Next.js (App Router), TypeScript strict.
- PostgreSQL avec `@payloadcms/db-postgres`.
- Le site public et l'espace membre sont des pages Next.js qui lisent les données avec l'API locale de Payload.
- Le back-office est l'admin de Payload. Les écrans orientés tâches (candidatures, cotisations, messages, pointage…) sont des vues personnalisées intégrées à l'admin. Les contenus éditoriaux (pages, actualités, médias, FAQ…) utilisent les vues natives, habillées aux couleurs de REC 242. Le détail est dans `docs/08-ecrans-back-office.md`.
- Styles : reprends les feuilles de `design/` (variables dans `design/tokens.css`). Pas de Tailwind, pas de bibliothèque de composants : la maquette doit être reproduite fidèlement.

## Règles à respecter

- Tout le texte visible est en français. Reprends les textes de la maquette mot pour mot, sauf ceux listés dans `docs/11-a-obtenir-de-rec242.md`.
- Jamais de tiret cadratin (—) dans les textes de l'interface, les e-mails ou les documents.
- On écrit « REC 242 », avec une espace.
- N'invente aucun chiffre, tarif, nom ou règle. Les montants viennent des statuts (`sources/`) et de `docs/05-regles-metier.md`. Si une information manque, laisse un champ administrable vide et note-le dans `docs/QUESTIONS.md`, ne la devine pas.
- Les règles métier (cotisations, relances, discipline, anti-doublon, visibilité dans l'annuaire) sont appliquées côté serveur, dans les hooks ou les fonctions d'accès de Payload, jamais seulement dans l'interface.
- Les contrôles « Démo : … » de la maquette (simuler un doublon, choisir un état d'écran, « Vue visiteur / Vue membre connecté », « Recommencer la démonstration ») servent seulement à présenter la maquette. Ne les reproduis pas : ces états doivent découler des vraies données.
- Les données affichées dans la maquette sont fictives. Elles servent de données de démonstration (`seed/`), jamais de valeurs codées en dur.
- Accessibilité : un seul titre de niveau 1 par page, étiquette visible sur chaque champ, focus visible, zones tactiles de 44 px minimum.
- Sécurité : contrôle d'accès sur chaque collection et chaque champ sensible, aucune coordonnée de membre dans le code des pages publiques, limitation des envois de formulaires.

## Comment travailler

- Commence chaque lot par une courte liste de ce que tu vas faire, puis code.
- À la fin d'un lot, lance les tests, puis compare chaque écran du lot à sa capture (Playwright, aux deux largeurs). Corrige les écarts visibles avant de passer au lot suivant.
- Tiens à jour `docs/AVANCEMENT.md` : ce qui est fait, ce qui reste, les écarts assumés avec la maquette et leur raison.
- Ne modifie pas les documents de `docs/01` à `docs/12` sans le signaler dans `docs/AVANCEMENT.md`.

## Commandes

Prérequis : Node 22.23 ou plus, pnpm 10, PostgreSQL 16 (`docker compose up -d` démarre PostgreSQL et Mailpit pour capturer les e-mails sur http://localhost:8025).

```bash
cp .env.example .env        # puis renseigner PAYLOAD_SECRET
pnpm install
pnpm dev                    # http://localhost:3000, admin sur /admin
pnpm seed                   # données de démonstration (idempotent)
pnpm lint && pnpm typecheck
pnpm test:int               # Vitest (tests/int)
pnpm test:e2e               # Playwright (tests/e2e), démarre le serveur si besoin
pnpm generate:types         # après chaque changement de collection
pnpm generate:importmap     # après l'ajout d'un composant d'admin
pnpm migrate:create <nom>   # à la fin de chaque lot qui modifie le schéma
pnpm migrate                # en préproduction et en production
```

En développement, Payload synchronise le schéma automatiquement (mode push). Une migration est créée à la fin de chaque lot qui change le schéma ; la production n'utilise que les migrations.

## Organisation du dépôt

- `src/app/(site)` : site public. `src/app/(espace-membre)` : espace membre (lot 6). `src/app/(payload)` : admin et API.
- `src/collections`, `src/globals`, `src/hooks`, `src/access`, `src/jobs`, `src/components/admin`, `src/emails`, `src/seed`.
- `src/styles` : copie des feuilles de `design/`. Corriger un style ici, jamais dans `design/` qui reste la référence de la maquette.
- `/composants` (développement seulement) : planche de contrôle des composants de base.
