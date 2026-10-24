# Plan de développement

Douze lots, dans cet ordre. Un lot est terminé quand tous ses critères sont remplis, les tests passent et `docs/AVANCEMENT.md` est à jour. Ne pas commencer un lot avant que le précédent soit terminé, sauf indication de Webtinix.

Chaque lot se termine par une comparaison visuelle : capture Playwright de chaque écran du lot à 1440 px et 390 px, mise côte à côte avec `captures/`. Les écarts restants sont listés dans `docs/AVANCEMENT.md` avec leur raison.

## Lot 0 : socle

- Application Next.js + Payload 3, TypeScript strict, PostgreSQL (Docker Compose pour le développement), ESLint et Prettier.
- Arborescence de `02-architecture.md`, `.env.example` documenté, migrations.
- Polices, `design/tokens.css` et feuilles de styles importées ; page de test qui affiche boutons, champs, badges et cartes.
- Tests : Vitest pour la logique, Playwright pour les parcours.
- Script `pnpm seed` qui charge `seed/` (vide pour l'instant, rempli au fil des lots).
- Section « Commandes » de `CLAUDE.md` complétée.

**Fini quand** : `pnpm dev` démarre, `/admin` affiche la création du premier utilisateur, la page de test reproduit les composants de la maquette, les tests passent en CI locale.

## Lot 1 : comptes, rôles, journal

- Collection `users` avec rôles multiples, règles de mot de passe, blocage, session de 30 minutes, alerte nouvel appareil, invitation.
- Fonctions d'accès par rôle (`04-roles-et-droits.md`), testées rôle par rôle.
- Collection `auditLog` et hooks qui l'alimentent (connexions, puis chaque lot ajoute ses actions).
- Admin habillé : logo, couleurs, menu de gauche groupé avec pastilles (compteurs à zéro pour l'instant), barre du haut, page de connexion (écran 01).
- Écrans 16 (utilisateurs, matrice) et 17 (journal).
- Adaptateur e-mail Nodemailer, gabarit commun, global `emailTemplates`, modèles 20, 21, 22. En développement : capture des e-mails (Mailpit ou équivalent).

**Fini quand** : chaque rôle de démonstration voit exactement les menus et les actions de la matrice ; une connexion échouée cinq fois bloque le compte ; l'invitation fonctionne de bout en bout.

## Lot 2 : référentiels et contenus

- Taxonomies, `media` (WebP, texte alternatif obligatoire), `people`, `commissions`, `partners`, `faq`, `testimonials`, `documents` (route protégée, compteur), globals `settings`, `keyFigures`, `navigation`, `pricing`, `directoryEdition`.
- `pages` avec blocs, brouillons, versions, aperçu en direct ; `news` avec programmation et réservé aux membres.
- Écrans du back-office 09, 10, 14, 15, 18, 22.
- Données de démonstration correspondantes.

**Fini quand** : on peut créer, prévisualiser, programmer et publier une page et une actualité ; les droits d'éditeur (brouillon sans publication) sont respectés.

## Lot 3 : site public, partie institutionnelle

- Mise en page commune (en-tête, menu mobile, pied, interrupteur d'animations, `rec-motion.js`).
- Écrans site 01 à 07, 18 à 21, 24 à 28. Données structurées, sitemap, robots, métadonnées.
- Recherche (écran 23) avec le plugin search.

**Fini quand** : ces écrans correspondent aux captures aux deux largeurs, Lighthouse mobile atteint 90 dans les quatre catégories sur l'accueil, une actualité réservée ne montre que son chapeau.

## Lot 4 : formulaires et messages

- Formulaires contact et partenariat (écrans site 08 et 22), anti-robot, limitation de débit, accusé de réception, routage.
- Collection `contactMessages`, écran back-office 13 (répondre par e-mail, WhatsApp `wa.me`, transmettre, notes, traité).

**Fini quand** : un message envoyé depuis le site arrive au bon rôle, la réponse part de contact@rec242.cg et apparaît dans le fil.

## Lot 5 : adhésion

- Collection `applications`, écran site 09 (montants depuis `pricing`), 10 (cinq étapes, brouillon local, anti-doublon serveur), 11.
- Paiement à la candidature : intégration MTN MoMo et Airtel Money en environnement de test, route de rappel, collection `payments`, reçus PDF numérotés sans trou (séquence en base, verrou).
- Écrans back-office 03 et 04, candidature papier, e-mails 1 à 5, alerte et pastille.

**Fini quand** : une candidature de test complète passe de « Reçue » à « Acceptée » ; un doublon est refusé avec le message exact ; un paiement de test produit le reçu PAY-0001 ; les e-mails partent avec les bonnes variables.

## Lot 6 : membres et espace membre (socle)

- Collections `members` (authentification), `companies`, `modificationRequests`, `networkMessages`.
- « Convertir en membre » : création du compte, numéro REC-AAAA-NNNN, échéance de cotisation, e-mail 4, lien d'activation.
- Espace membre : mise en page, connexion et ses six états (écran 01), tableau de bord (02), profil (03), carte (13).
- Back-office : écrans 05 (fiches, demandes de modification, import et export) et 06 (hors discipline).

**Fini quand** : le parcours candidature → activation → connexion → carte fonctionne ; une demande de modification validée met à jour la fiche ; un membre ne peut lire aucune donnée d'un autre membre par l'API (test).

## Lot 7 : annuaire

- Écrans site 12 et 13, espace membre 07 et 08 ; règles de visibilité ; filtres dans l'URL ; mise en avant sur l'accueil.
- Mises en relation (`connectionRequests`), plafond hebdomadaire, signalement.
- Annuaire imprimé : réservation d'encart (`directoryAds`), export imprimeur.

**Fini quand** : le HTML des pages publiques ne contient aucune coordonnée (test automatique), une mise en relation acceptée partage seulement les coordonnées choisies.

## Lot 8 : événements

- Collections `events`, `registrations` ; écrans site 14, 15, 16 ; espace membre 04 ; back-office 07 et 08.
- Inscription visiteur et membre, capacité, liste d'attente et promotion, billet QR, fichier .ics, annulation.
- Pointage : liste et scan par la caméra du téléphone (hors connexion puis synchronisation), exports.
- E-mails 6 à 9, tâche du rappel la veille.

**Fini quand** : avec une capacité de 2, la troisième inscription part en liste d'attente et est promue à la première annulation ; un QR de carte ou de billet scanné marque la présence.

## Lot 9 : opportunités

- Collections `opportunities`, `opportunityReplies` ; écrans site 17 ; espace membre 05 et 06 ; back-office 11 et 20.
- Modération, détection des coordonnées dans le texte, expiration automatique, alertes aux secteurs concernés, e-mails 16, 17 et 25.

**Fini quand** : une annonce de membre passe par la modération avant d'être visible ; une opportunité expirée disparaît le lendemain de sa date limite.

## Lot 10 : experts, échanges, commissions

- `expertRequests`, `commissionRequests` ; écrans espace membre 09 et 10 (boîte de réception à quatre onglets) ; back-office 19 et 21.
- Tâche « sans réponse » à 5 jours ouvrés, relance, réattribution ; e-mails 14 et 15.

**Fini quand** : une question envoyée à un expert peut être suivie, relancée, réattribuée et clôturée ; les compteurs de non-lus sont justes.

## Lot 11 : cotisations et discipline

- `dues`, échéancier, paiement des tranches et renouvellement depuis l'espace membre (écran 11), documents personnels (écran 12).
- Back-office 12 : relances (contrôle des 15 jours), paiement manuel, export comptable, constat de perte.
- `disciplinaryCases` et section Discipline de l'écran 06, courriers PDF, suspension et levée automatique.
- E-mails 10 à 13, 18 et 19 ; tableau de bord du back-office (écran 02) complet avec tous ses compteurs.

**Fini quand** : la règle des trois relances ne permet pas d'envoyer la deuxième avant 15 jours ; une procédure ne peut pas aboutir à une sanction sans les étapes de l'article 15 ; un membre suspendu ne peut plus se connecter.

## Lot 12 : finitions et mise en production

- Recette complète (`12-recette.md`), corrections.
- Accessibilité (axe sur tous les écrans, navigation au clavier), performance (budget de `02-architecture.md`).
- Sécurité : en-têtes, CSRF, revue des fonctions d'accès, test des routes protégées.
- Déploiement sur le VPS, sauvegardes, préproduction, redirections, Search Console.
- Remplacement des données de démonstration par les vraies données fournies par REC 242 ; passage des paiements en production quand les comptes marchands sont prêts.
- Guide d'utilisation du back-office (PDF court, avec captures) pour l'équipe de REC 242.
