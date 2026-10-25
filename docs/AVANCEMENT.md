# Avancement

Tenu à jour à la fin de chaque lot.

| Lot | Statut | Date | Remarques |
|---|---|---|---|
| 0 Socle | Fait | 25/10/2026 | Payload 3.92, Next 16.3, PostgreSQL 16, admin en français, styles et polices de la maquette, planche `/composants`, Vitest et Playwright, migration initiale, script de seed. |
| 1 Comptes, rôles, journal | Fait | 25/10/2026 | Rôles et matrice (`src/access/roles.ts`), règles de mot de passe, blocage, session de 30 min, alerte nouvel appareil, invitation (lien 72 h), journal non modifiable avec filtres et export CSV, menu groupé avec pastilles, connexion habillée, gabarit e-mail et 30 modèles modifiables. |
| 2 Référentiels et contenus | Fait | 25/10/2026 | Taxonomies, médiathèque WebP (3 tailles), gouvernance et experts, commissions, partenaires, FAQ, témoignages, documents protégés (route de téléchargement, compteur, versions), paramètres en onglets (dont tarifs et annuaire imprimé), menus, pages par blocs avec brouillons et versions, actualités (relecture, programmation, archivage, réservé aux membres), plugin SEO, tâche de publication programmée, données de démonstration. |
| 3 Site institutionnel | Fait | 25/10/2026 | Mise en page commune ; écrans 01 à 07, 18 à 21, 23 à 28 en gabarits dont les textes viennent des blocs des pages (seed `src/seed/pages.ts`) et les listes des collections ; filtre des experts ; actualités (à la une, filtres type et secteur dans l’adresse, pagination, actualité réservée) ; article (`NewsArticle`, partage, « À lire aussi ») ; presse (communiqués par année, kit média) ; recherche (`@payloadcms/plugin-search`, contenu public seulement) ; plan du site ; pages légales ; 404 ; aperçu des brouillons `/apercu` (mode brouillon Next réservé à l’équipe, aperçu en direct) ; `sitemap.xml`, `robots.txt`, métadonnées et URL canonique par page, `BreadcrumbList` ; revalidation du site à chaque modification d’un contenu. Tests : 3 d’intégration, 23 E2E. Lighthouse mobile : voir « Lot 3 : performance ». |
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
- Site, sections qui dépendent des lots suivants : sur l’accueil, la carte « Prochain rendez-vous », l’agenda, « Le réseau en visages » et les opportunités (lots 7 à 9) ; sur Formalisation, le prochain atelier ; sur l’article, l’événement lié (lot 8). Elles n’apparaissent pas tant que leurs données n’existent pas (règle « une section sans contenu disparaît ») et seront branchées dans ces lots.
- Commissions : la mention « sur désignation » d’Éthique et Vérification est portée par le bandeau photo en bas de page, comme dans la maquette, pas par la carte.
- Presse, kit média : une seule vignette par carte (la maquette juxtapose deux images pour le logo et les photos).
- Actualités : la maquette montrait chaque actualité deux fois (publique et réservée) ; ici une seule carte par actualité, et l’actualité « à la une » est choisie dans l’admin (case « À la une »), la plus récente à défaut.
- Recherche : la maquette n’a pas de titre de niveau 1 sur cet écran ; un titre « Rechercher sur le site » est ajouté, masqué visuellement.
- Pied de page : les titres de colonnes sont des `h2` (ordre des titres pour l’accessibilité) avec le style des `h4` de la maquette.
- Apostrophes : les textes sont saisis avec l’apostrophe typographique (’), la maquette mélange ’ et '.

## Notes techniques

- Lot 0 : le gabarit Payload livrait une configuration ESLint cassée (`@eslint/eslintrc` absent) ; remplacée par la configuration plate de `eslint-config-next`. `@playwright/test` aligné sur la version 1.63 des navigateurs installés.
- Lot 1 : les écritures faites pendant la connexion (dernière connexion, journal) passent par la transaction de la requête (`req`), sinon PostgreSQL se bloque sur la ligne de l'utilisateur. Les tests d'intégration tournent en environnement `node` (jsdom casse la signature des jetons). Payload replie son menu jusqu'à 1440 px : `NavLinks` le rouvre au-dessus de 1024 px pour coller à la maquette.
- Lot 2 : la publication programmée est une tâche Payload (`src/jobs/publierProgrammes.ts`, toutes les minutes) plutôt que la programmation native, pour garder le statut « Programmé » visible dans la liste. Les fichiers des documents sont dans `private/documents` (hors dossier public) ; une nouvelle version remplace le fichier, l'historique garde la trace (numéro, nom, date). Les PDF des statuts, du règlement, de la charte et du bulletin viennent de `sources/` ; les autres documents sont des PDF de démonstration à remplacer.
- E-mails en développement : Mailpit (`docker compose`) ou MailDev (`npx maildev --smtp 1025 --web 1080`) ; `tests/helpers/mailbox.ts` lit l'un ou l'autre.

## Modifications apportées aux documents

- `03-modele-de-donnees.md` : les globals `keyFigures`, `pricing` et `directoryEdition` sont des onglets du global `settings` (Chiffres clés, Tarifs), comme l'écran 15 de la maquette. Les réglages d'alerte sont dans l'onglet « E-mails automatiques » de `settings`, les textes des modèles dans le global `emailTemplates`.
- Secteurs : dix secteurs (liste de `03-modele-de-donnees.md`, avec Santé), alors que `seed/contenus.json` en listait neuf ; l'annuaire de la maquette filtre bien sur Santé.

- `09-emails-et-notifications.md` : le code ajoute des variantes « bis » (liste d'attente, relance d'un expert, réponse à une mise en relation, décision disciplinaire) pour que chaque envoi ait son propre modèle modifiable. Les numéros du document restent valables.

## Lot 3 : notes

- Principe : chaque page institutionnelle a un gabarit (`src/app/(site)/…/page.tsx`) qui reproduit le balisage de `maquette/sources/B-Site.dc.html`. Les textes viennent des blocs de la page (`getPage(chemin)` puis `block(page, 'ancre')`, champ « Section » des blocs), les listes des collections. Les liens « document:Titre » du seed sont résolus en adresse de téléchargement.
- Champs ajoutés : blocs « Section » et « Cartes » (boutons, note, mention « À valider »), documents (« Dans l’espace presse » : communiqué ou kit média), commissions (image de la carte), étiquettes d’expertise (« Proposée comme filtre sur la page Gouvernance »), actualités (signature, « À la une », « À lire aussi »). Migration `20261025_012157_lot3_site`.
- Sécurité : le corps, les blocs et le PDF d’une actualité réservée ont une fonction d’accès de champ (`reservedFieldRead`) : l’API ne les renvoie qu’à l’équipe et aux membres actifs. L’index de recherche ne contient que le titre et le chapeau d’une actualité réservée.
- Le site est prérendu : un hook (`src/hooks/revalidate.ts`) relance le rendu à chaque modification d’un contenu affiché (pages, actualités, documents, gouvernance, commissions, partenaires, FAQ, médias, taxonomies, paramètres, menus).
- L’en-tête `Critical-CH` ajouté par Payload est limité à `/admin` (`next.config.ts`) : sur le site il faisait recommencer la première requête (environ 0,7 s).
- La 404 passe par une route attrape-tout du site (`[...inconnu]`) qui appelle `notFound()`, pour garder l’en-tête et le pied du site (deux mises en page racines : site et admin).
- Développement : ne pas lancer `pnpm seed` ou `pnpm test:int` pendant que `pnpm dev` tourne (les deux synchronisent le schéma et se bloquent mutuellement). Vitest exécute les fichiers un par un.

## Lot 3 : performance

Lighthouse mobile sur l’accueil, compilation de production, sur le poste de développement Windows (Edge sans interface, limitation simulée) : accessibilité 100, bonnes pratiques 100, SEO 100, performance entre 80 et 85 selon les passages (LCP simulé 3,6 s, LCP réellement observé 0,6 s). L’écart vient du temps de calcul CPU modélisé (styles et animations de la maquette, scripts Next). Corrections déjà faites : images responsives (`srcset`), image du héros révélée dès le premier affichage, polices du premier écran préchargées, logo en WebP redimensionné, pas de préchargement automatique des liens de navigation, en-tête `Critical-CH` limité à l’admin. Le seuil de 90 n’est pas encore atteint de façon stable : à reprendre au lot 12 sur le serveur de préproduction (mesure hors poste de développement), en priorité le coût des styles d’animation.
