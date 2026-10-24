# Avancement

Tenu à jour à la fin de chaque lot.

| Lot | Statut | Date | Remarques |
|---|---|---|---|
| 0 Socle | Fait | 25/10/2026 | Payload 3.92, Next 16.3, PostgreSQL 16, admin en français, styles et polices de la maquette, planche `/composants`, Vitest et Playwright, migration initiale, script de seed. |
| 1 Comptes, rôles, journal | Fait | 25/10/2026 | Rôles et matrice (`src/access/roles.ts`), règles de mot de passe, blocage, session de 30 min, alerte nouvel appareil, invitation (lien 72 h), journal non modifiable avec filtres et export CSV, menu groupé avec pastilles, connexion habillée, gabarit e-mail et 30 modèles modifiables. |
| 2 Référentiels et contenus | À faire | | |
| 3 Site institutionnel | À faire | | |
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
- Journal : la ville n'est renseignée que si le frontal transmet un en-tête de géolocalisation (Nginx GeoIP, à configurer au lot 12) ; sinon la colonne reste vide. On n'invente pas de ville.

## Notes techniques

- Lot 0 : le gabarit Payload livrait une configuration ESLint cassée (`@eslint/eslintrc` absent) ; remplacée par la configuration plate de `eslint-config-next`. `@playwright/test` aligné sur la version 1.63 des navigateurs installés.
- Lot 1 : les écritures faites pendant la connexion (dernière connexion, journal) passent par la transaction de la requête (`req`), sinon PostgreSQL se bloque sur la ligne de l'utilisateur. Les tests d'intégration tournent en environnement `node` (jsdom casse la signature des jetons). Payload replie son menu jusqu'à 1440 px : `NavLinks` le rouvre au-dessus de 1024 px pour coller à la maquette.
- E-mails en développement : Mailpit (`docker compose`) ou MailDev (`npx maildev --smtp 1025 --web 1080`) ; `tests/helpers/mailbox.ts` lit l'un ou l'autre.

## Modifications apportées aux documents

- `09-emails-et-notifications.md` : le code ajoute des variantes « bis » (liste d'attente, relance d'un expert, réponse à une mise en relation, décision disciplinaire) pour que chaque envoi ait son propre modèle modifiable. Les numéros du document restent valables.
