# Avancement

Tenu à jour à la fin de chaque lot.

| Lot | Statut | Date | Remarques |
|---|---|---|---|
| 0 Socle | Fait | 25/10/2026 | Payload 3.92, Next 16.3, PostgreSQL 16, admin en français, styles et polices de la maquette, planche `/composants`, Vitest et Playwright, migration initiale, script de seed. |
| 1 Comptes, rôles, journal | Fait | 25/10/2026 | Rôles et matrice (`src/access/roles.ts`), règles de mot de passe, blocage, session de 30 min, alerte nouvel appareil, invitation (lien 72 h), journal non modifiable avec filtres et export CSV, menu groupé avec pastilles, connexion habillée, gabarit e-mail et 30 modèles modifiables. |
| 2 Référentiels et contenus | Fait | 25/10/2026 | Taxonomies, médiathèque WebP (3 tailles), gouvernance et experts, commissions, partenaires, FAQ, témoignages, documents protégés (route de téléchargement, compteur, versions), paramètres en onglets (dont tarifs et annuaire imprimé), menus, pages par blocs avec brouillons et versions, actualités (relecture, programmation, archivage, réservé aux membres), plugin SEO, tâche de publication programmée, données de démonstration. |
| 3 Site institutionnel | Fait | 25/10/2026 | Mise en page commune ; écrans 01 à 07, 18 à 21, 23 à 28 en gabarits dont les textes viennent des blocs des pages (seed `src/seed/pages.ts`) et les listes des collections ; filtre des experts ; actualités (à la une, filtres type et secteur dans l’adresse, pagination, actualité réservée) ; article (`NewsArticle`, partage, « À lire aussi ») ; presse (communiqués par année, kit média) ; recherche (`@payloadcms/plugin-search`, contenu public seulement) ; plan du site ; pages légales ; 404 ; aperçu des brouillons `/apercu` (mode brouillon Next réservé à l’équipe, aperçu en direct) ; `sitemap.xml`, `robots.txt`, métadonnées et URL canonique par page, `BreadcrumbList` ; revalidation du site à chaque modification d’un contenu. Tests : 3 d’intégration, 23 E2E. Lighthouse mobile : voir « Lot 3 : performance ». |
| 4 Formulaires et messages | Fait | 25/10/2026 | Formulaires Contact (22, motif en pastilles, préremplissage par l’adresse `?motif=&objet=`) et Devenir partenaire (08) en actions serveur : champ piège, jeton horodaté signé (refus avant 3 s ou après 24 h), 5 envois par heure et par appareil, erreurs sous les champs sans perte de saisie. Collection `contactMessages` : routage par motif, lecture limitée aux rôles destinataires (fonctions d’accès), coordonnées de l’expéditeur non modifiables, pas de création par l’API. Accusé de réception (modèle 23), alerte à l’équipe selon « Alertes aussi pour » (modèle 23 bis). Écran back-office 13 en vue personnalisée : filtres, export CSV, réponse par e-mail (depuis l’adresse d’envoi) ou WhatsApp (`wa.me`), réponses types (Paramètres), transmission, notes internes, rouvrir, journal. Tests : 3 d’intégration, 5 E2E. |
| 5 Adhésion | Fait | 25/10/2026 | Écran site 09 (montants, total de la première année et tranches calculés depuis Paramètres › Tarifs ; blocs « Comparatif » et « Statuts de membre ») ; écran 10 en cinq étapes (brouillon sur l’appareil, contrôles serveur à chaque étape, anti-doublon serveur avec le message exact et 10 essais par heure, trois secteurs au plus, pièces jointes PDF/JPG/PNG de 5 Mo) ; écran 11 accessible seulement juste après l’envoi (cookie signé de 30 min) avec suivi du paiement mobile. Collections `applications` (numéros C-NNNN / REC-C-AAAA-NNNN, règles dans les hooks), `payments` (reçus PAY-NNNN sans trou, attribués à la confirmation, montants figés, PDF généré à la demande), `pieces` (stockage privé), `counters`. MTN MoMo et Airtel Money (API Collection) avec mode simulation, route de rappel `/api/paiements/[operateur]` qui relit toujours le statut chez l’opérateur, tâche de vérification chaque minute. Écrans back-office 03 (filtres et compteurs, export, candidature papier avec paiement à la saisie pour le trésorier) et 04 (statut, refus motivé avec e-mail, complément, rendez-vous, notes, e-mails modèles modifiables avant envoi, historique). E-mails 1, 2, 3, 5 et 12 ; remboursement à traiter prévenu au trésorier. Tests : 6 d’intégration, 5 E2E. « Convertir en membre » : au lot 6. |
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
- Pied de page mobile : l’interrupteur « Activer les animations » chevauchait le copyright, dans la maquette aussi ; corrigé (il passe sous le copyright).
- Messages : pas de photo pour l’expéditeur (initiales seulement) ; un visiteur n’a pas de photo dans nos données, la maquette illustrait avec des portraits.
- Messages : les réponses types ont les titres de la maquette ; leurs textes sont des propositions génériques à relire par REC 242 (Paramètres, onglet E-mails automatiques). La maquette ne montrait que des réponses déjà personnalisées.
- Contact : quand un seul champ obligatoire manque, l’encadré d’erreur dit « Un champ est à compléter » (la maquette ne montre que le cas « Deux champs sont à compléter »).
- Contact : « Une copie vous a été envoyée par e-mail » n’apparaît que si l’expéditeur a donné son e-mail (l’accusé de réception part à cette adresse).
- Candidature : la tranche d’âge part de « Choisir » (la maquette présélectionnait 18-25) pour ne pas enregistrer une réponse que le candidat n’a pas donnée. Les liens vers les statuts, le règlement et la charte sont sous la case d’acceptation (un lien ne peut pas être placé dans la case, qui est un bouton).
- Merci : une ligne indique l’état du paiement mobile (« validez la demande sur votre téléphone », puis « Paiement reçu : le reçu PAY-0001 vous a été envoyé par e-mail ») ; la maquette ne montrait pas cet état. La ligne « Recommencer la démonstration » n’est pas reprise (contrôle de démonstration).
- Back-office, candidatures : pas de photo du candidat (initiales), le formulaire ne demande pas de photo. Au-dessus de la vue, l’en-tête de document de Payload (titre et onglets Éditer, API) reste visible.
- Candidature papier : le champ « Reçu lors de » propose « Passage au siège » ou « Un événement » avec le nom à saisir ; la liste des événements arrivera avec le lot 8. Le paiement reçu à la saisie n’est proposé qu’au trésorier et aux administrateurs (droit « Cotisations et paiements »).

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

## Lot 5 : notes

- Paiement mobile : `PAIEMENT_MODE` (simulation par défaut en développement ; « test » pour les bacs à sable ; en production sans clés, le paiement mobile est indisponible et aucun identifiant de simulation n’est jamais validé). En simulation, le paiement est confirmé 5 secondes après la demande ; un numéro payeur qui se termine par 0 simule un refus. Variables dans `.env.example`.
- Le rappel d’un opérateur ne fait jamais foi : le statut est relu par l’API de l’opérateur (MTN : `GET /collection/v1_0/requesttopay/{id}` ; Airtel : `GET /standard/v1/payments/{id}`). La tâche `verifierPaiements` relit chaque minute les paiements en attente depuis moins de 48 h.
- Numérotation : table `counters` incrémentée par une requête unique qui verrouille la ligne, dans la transaction de l’enregistrement. Le numéro de reçu n’est tiré qu’au passage au statut « Payé ». Les candidatures de démonstration reprennent les numéros de la maquette (C-0037 à C-0043).
- Les écritures sur un même dossier depuis l’écran 04 sont envoyées l’une après l’autre (sinon deux mises à jour simultanées de Payload s’écrasent).
- Les champs de candidature obligatoires en ligne (tranche d’âge, description, ancienneté, objectifs) ne le sont pas pour un bulletin papier ; le consentement et l’acceptation des textes restent obligatoires.
