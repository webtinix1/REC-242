# Avancement

Tenu à jour à la fin de chaque lot.

| Lot | Statut | Date | Remarques |
|---|---|---|---|
| 0 Socle | Fait | 25/10/2026 | Payload 3.92, Next 16.3, PostgreSQL 16, admin en français, styles et polices de la maquette, planche `/composants`, Vitest et Playwright, migration initiale, script de seed. |
| 1 Comptes, rôles, journal | Fait | 25/10/2026 | Rôles et matrice (`src/access/roles.ts`), règles de mot de passe, blocage, session de 30 min, alerte nouvel appareil, invitation (lien 72 h), journal non modifiable avec filtres et export CSV, menu groupé avec pastilles, connexion habillée, gabarit e-mail et 30 modèles modifiables. |
| 2 Référentiels et contenus | Fait | 25/10/2026 | Taxonomies, médiathèque WebP (3 tailles), gouvernance et experts, commissions, partenaires, FAQ, témoignages, documents protégés (route de téléchargement, compteur, versions), paramètres en onglets (dont tarifs et annuaire imprimé), menus, pages par blocs avec brouillons et versions, actualités (relecture, programmation, archivage, réservé aux membres), plugin SEO, tâche de publication programmée, données de démonstration. |
| 3 Site institutionnel | En cours | 25/10/2026 | Fait : mise en page du site (en-tête et menu depuis le global `navigation`, pied de page, barre d’onglets et menu mobile, lien d’évitement, moteur d’animation `rec-motion.js` relancé à chaque navigation, données structurées `Organization`), styles d’adaptation des liens (`src/styles/site-next.css`), couche de données (`src/lib/site/`), bloc générique « Section » et champ « ancre » sur tous les blocs. Reste : voir « Reprise du lot 3 » ci-dessous. |
| 4 Formulaires et messages | À faire | | |
| 5 Adhésion | À faire | | |
| 6 Membres et espace membre | À faire | | |
| 7 Annuaire | À faire | | |
| 8 Événements | À faire | | |
| 9 Opportunités | À faire | | |
| 10 Experts, échanges, commissions | À faire | | |
| 11 Cotisations et discipline | À faire | | |
| 12 Finitions et mise en production | À faire | | |

## Écarts assumés avec la maquette

- Back-office, barre du haut : c'est encore celle de Payload (fil d'Ariane, avatar). La barre de la maquette (titre, recherche globale, utilisateur) viendra avec le tableau de bord (lot 11), quand la recherche aura des contenus à parcourir.
- Utilisateurs : le bouton natif « Créer » de Payload reste visible pour le super administrateur (création directe avec mot de passe), en plus de « Inviter un utilisateur ».
- Actualités de démonstration : toutes publiées, comme sur le site de la maquette (l'écran 09 de la maquette en montrait trois en brouillon, programmé et relecture pour illustrer les statuts).
- Journal : la ville n'est renseignée que si le frontal transmet un en-tête de géolocalisation (Nginx GeoIP, à configurer au lot 12) ; sinon la colonne reste vide. On n'invente pas de ville.

## Notes techniques

- Lot 0 : le gabarit Payload livrait une configuration ESLint cassée (`@eslint/eslintrc` absent) ; remplacée par la configuration plate de `eslint-config-next`. `@playwright/test` aligné sur la version 1.63 des navigateurs installés.
- Lot 1 : les écritures faites pendant la connexion (dernière connexion, journal) passent par la transaction de la requête (`req`), sinon PostgreSQL se bloque sur la ligne de l'utilisateur. Les tests d'intégration tournent en environnement `node` (jsdom casse la signature des jetons). Payload replie son menu jusqu'à 1440 px : `NavLinks` le rouvre au-dessus de 1024 px pour coller à la maquette.
- Lot 2 : la publication programmée est une tâche Payload (`src/jobs/publierProgrammes.ts`, toutes les minutes) plutôt que la programmation native, pour garder le statut « Programmé » visible dans la liste. Les fichiers des documents sont dans `private/documents` (hors dossier public) ; une nouvelle version remplace le fichier, l'historique garde la trace (numéro, nom, date). Les PDF des statuts, du règlement, de la charte et du bulletin viennent de `sources/` ; les autres documents sont des PDF de démonstration à remplacer.
- E-mails en développement : Mailpit (`docker compose`) ou MailDev (`npx maildev --smtp 1025 --web 1080`) ; `tests/helpers/mailbox.ts` lit l'un ou l'autre.

## Modifications apportées aux documents

- `03-modele-de-donnees.md` : les globals `keyFigures`, `pricing` et `directoryEdition` sont des onglets du global `settings` (Chiffres clés, Tarifs), comme l'écran 15 de la maquette. Les réglages d'alerte sont dans l'onglet « E-mails automatiques » de `settings`, les textes des modèles dans le global `emailTemplates`.
- Secteurs : dix secteurs (liste de `03-modele-de-donnees.md`, avec Santé), alors que `seed/contenus.json` en listait neuf ; l'annuaire de la maquette filtre bien sur Santé.

- `09-emails-et-notifications.md` : le code ajoute des variantes « bis » (liste d'attente, relance d'un expert, réponse à une mise en relation, décision disciplinaire) pour que chaque envoi ait son propre modèle modifiable. Les numéros du document restent valables.

## Reprise du lot 3

Principe : chaque page institutionnelle a un gabarit (`src/app/(site)/…/page.tsx`) qui reproduit le balisage de `maquette/sources/B-Site.dc.html` (classes de `site.css`, attributs `data-m*`). Les textes viennent des blocs de la page (`getPage(chemin)` puis `block(page, 'ancre')`), les listes des collections (gouvernance, commissions, partenaires, FAQ, actualités, documents, chiffres clés). Une section sans contenu ne s'affiche pas.

À faire, dans l'ordre :
1. `src/seed/pages.ts` : blocs de chaque page avec les textes de la maquette (ancres proposées : accueil `hero`, `piliers`, `avantages`, `agenda`, `visages`, `formalisation`, `opportunites`, `actualites`, `partenaires`, `faq`, `final` ; le-reseau `hero`, `histoire`, `but`, `mission`, `objectifs`, `organisation`, `comite`, `valeurs`, `moyens`, `chiffres`, `statuts` ; etc.). Mettre à jour les pages existantes dont le contenu est vide. `media()` accepte un point focal pour reproduire les `object-position` de la maquette (correspondance des images : `design/images/correspondance-blob.json`).
2. Gabarits : accueil (01), le réseau (02), gouvernance (03, filtre des experts par étiquette en composant client), commissions (04), antennes (05), écosystème (06), partenaires (07), formalisation (18), actualités (19, filtres type et secteur dans l'URL, pagination), article (20, `NewsArticle`), presse (21), recherche (23, plugin search à installer), plan du site (24), pages légales (25 à 27, style `legal`), 404 (28, `not-found.tsx`).
3. Route `/apercu` (aperçu en direct des pages et actualités, déjà configuré dans les collections).
4. `sitemap.ts`, `robots.ts`, métadonnées par page (plugin SEO), fil d'Ariane `BreadcrumbList`.
5. Comparaison aux captures (1440 et 390 px), Lighthouse mobile ≥ 90 sur l'accueil, tests E2E du lot.
