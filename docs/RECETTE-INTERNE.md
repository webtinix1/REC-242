# Recette interne (Webtinix)

Déroulé des scénarios de `docs/12-recette.md` sur le poste de développement, avant la recette en préproduction par Webtinix et REC 242. Date : 27 octobre 2026. Base : données de démonstration (`pnpm seed`). E-mails capturés par Mailpit (http://localhost:8025).

## Conditions et limites

- **Paiements en mode « simulation »** (`PAIEMENT_MODE=simulation`, aucun appel aux opérateurs). Le mode « test » (bacs à sable MTN MoMo et Airtel Money) demande les clés de test des opérateurs, que REC 242 n'a pas encore fournies (`docs/11-a-obtenir-de-rec242.md`). À rejouer en préproduction avec ces clés.
- Pas d'accès extérieur depuis le poste : pas de rendu Gmail ni Outlook, pas de téléphone Android en 4G. Ces contrôles restent pour la préproduction.
- Les délais (5 jours ouvrés, 15 jours de défense, 30 jours de recours, 72 h d'activation) sont vérifiés en avançant les dates enregistrées (« horloge simulée »), jamais en attendant.
- Légende : **OK** = vérifié par un test automatique qui passe ; **Prépro** = à vérifier en préproduction (dépend d'un service extérieur ou d'un appareil) ; **Partiel** = règle appliquée par le serveur, mais une partie du parcours n'est vérifiée que par le code ou à la main.

Nouveau fichier de tests écrit pour cette recette : `tests/int/recette.int.spec.ts` (13 tests), qui couvre les points qui n'avaient pas encore de test.

## Parcours principaux

| # | Scénario | Résultat | Preuve | Reste à voir |
|---|---|---|---|---|
| 1 | Candidature en ligne | OK | `e2e/lot5-adhesion` « candidature complète : paiement mobile, page Merci, reçu et e-mails », « Adhérer : montants calculés depuis les Paramètres » ; `int/adhesion` (reçus sans trou, montants depuis les tarifs) | Paiement MTN MoMo en mode test (Prépro). Pastille du back-office : contrôle manuel à faire |
| 2 | Doublon | OK | `e2e/lot5-adhesion` « doublon : message exact à l'étape 1 » ; `int/adhesion` (même e-mail ou même téléphone écrit autrement, normalisation 06… → +242 06…) | |
| 3 | Quatrième secteur | OK | `e2e/lot5-adhesion` (message « Trois secteurs au maximum ») ; `int/adhesion` (refus serveur) | |
| 4 | Traitement | OK | `e2e/lot5-adhesion` « back-office : … de « Reçue » à « Acceptée » » ; `e2e/lot6-membres` (conversion, activation, connexion, carte) ; `int/membres` (conversion, lien 72 h) ; `int/recette` « demande de complément » | Contenu de l’e-mail de bienvenue : relecture à faire dans Mailpit |
| 5 | Refus | OK | `int/adhesion` (motif obligatoire) ; `int/recette` « refus : e-mail de refus au candidat, paiement en « remboursement à traiter », trésorier prévenu » | Formule de remboursement à fixer par REC 242 (`docs/05` §3) |
| 6 | Activation et connexion | OK | `e2e/lot6-membres` (mot de passe, connexion, carte avec QR et PDF, lien déjà utilisé refusé) ; `int/membres` (validité de la carte) | |
| 7 | Profil | Partiel | `int/membres` (demande de modification : valeur actuelle conservée jusqu'à validation) ; `int/securite` (téléphone non modifiable en direct) | Masquer son e-mail et retirer sa fiche : pas encore de test automatique, contrôle manuel à faire |
| 8 | Annuaire | OK | `e2e/lot7-annuaire` (aucune coordonnée dans le HTML public, coordonnées selon les choix en membre) ; `int/annuaire` ; `int/recette` « un membre devenu « ancien » … quitte l'annuaire » | |
| 9 | Mise en relation | OK | `int/annuaire` (acceptation, coordonnées partagées, onzième demande bloquée) ; `int/recette` « mise en relation refusée » | |
| 10 | Événement | Partiel | `int/evenements` (capacité 2, liste d'attente, promotion, scan une seule fois) ; `e2e/lot8-evenements` (inscription, billet, .ics, annulation) ; `int/recette` « promotion … l'e-mail « place libérée » part » | Rappel de la veille (tâche `src/jobs/rappelVeille.ts`) et scan en mode avion puis synchronisation (`Scanner.tsx`) : à jouer en préproduction sur un téléphone |
| 11 | Opportunité de membre | OK | `int/opportunites` (modération, réponse, expiration le lendemain) ; `e2e/lot9-opportunites` | |
| 12 | Expert | OK | `int/echanges` (sans réponse, relance, réattribution, réponse, clôture) ; `int/recette` « cinq jours ouvrés enjambent le week-end » | E-mail à l’expert avec son lien : relecture à faire dans Mailpit |
| 13 | Commission | OK | `int/echanges` (demande acceptée, commission ajoutée au membre) | Affichage dans le profil : contrôle manuel à faire |
| 14 | Cotisation | Partiel | `e2e/lot11-cotisations` ; `int/cotisations` ; `int/adhesion` (reçus sans trou) | Paiement de la deuxième tranche par opérateur en mode test (Prépro) |
| 15 | Relances | OK | `int/cotisations` « trois relances au plus, la deuxième pas avant 15 jours, puis constat de perte » ; `int/recette` (sortie de l'annuaire) | |
| 16 | Discipline | OK, après correction | `int/cotisations` (étapes de l'article 15, suspension, levée automatique) ; `int/recette` « défense de 15 jours … J+14 refusé, J+15 accepté », « le délai de défense ne peut pas être contourné » | Voir « Anomalies » |
| 17 | Message du site | OK | `e2e/lot4-messages` (réponse par e-mail, statut « Traité ») ; `int/messages` (motif Presse vers l'éditeur) | |
| 18 | Contenus | OK | `int/contenus` (éditeur sans droit de publier, publication programmée) ; `e2e/lot3-site` (actualité réservée : chapeau seul pour le visiteur) | |
| 19 | Paramètres | OK | `int/contenus` (tarifs réservés à l'administrateur, lien du groupe jamais public) ; `int/recette` « changer le lien du groupe WhatsApp est inscrit au journal », « modifier un tarif ne change pas une échéance déjà émise » | Chiffre clé vidé qui disparaît du site : contrôle manuel à faire |
| 20 | Droits | OK | `e2e/securite` « chaque rôle de l'équipe lit selon la matrice » ; `int/securite` (lectures et écritures des six rôles) ; `e2e/lot1-comptes` (menu selon le rôle) | |

## Sécurité

| Contrôle | Résultat | Preuve |
|---|---|---|
| Cinq mots de passe faux : blocage 15 minutes | OK | `int/users` « bloque le compte après 5 essais » (durée réglée à 15 min dans `Users.ts`) |
| Alerte de connexion d'un administrateur depuis un nouveau navigateur | Partiel | Code `src/collections/Users.ts` (empreinte d'appareil, e-mail, journal) ; pas de test automatique, contrôle manuel à faire |
| Déconnexion après 30 minutes d'inactivité | Partiel | `tokenExpiration` de 30 min dans `Users.ts` ; pas d'attente réelle |
| Document réservé sans session | OK | `e2e/securite` « un document réservé n'est pas téléchargeable sans session » |
| Un membre lit `/api/members/[id]` d'un autre | OK | `e2e/securite` « un membre ne lit ni ne modifie les données d'un autre membre » ; `int/membres`, `int/securite` |
| Injection de HTML et de script neutralisée | OK | `int/emails` (échappement) ; `int/recette` « HTML et script d'un message de contact neutralisés dans les e-mails » |
| Limitation de débit des formulaires | OK | `int/recette` « limitation de débit » (plafond, puis réouverture après la fenêtre, sur la vraie action du formulaire de contact) |
| En-têtes de sécurité, CSRF, lien d'e-mail vers l'espace membre | OK | `e2e/securite` |

## Qualité

| Contrôle | Résultat | Preuve |
|---|---|---|
| Lighthouse mobile ≥ 90 | Non atteint en performance sur ce poste | `docs/AVANCEMENT.md`, « Lot 12 : performance » : accessibilité, bonnes pratiques et SEO ≥ 90 ; performance 66 à 89, à remesurer en préproduction |
| Axe : zéro erreur grave ou critique | Voir « Résultats » | `e2e/accessibilite` ; `docs/AVANCEMENT.md`, « Lot 12 : accessibilité » |
| Navigation au clavier (candidature, espace membre) | OK | `e2e/accessibilite`, « parcours au clavier » |
| `prefers-reduced-motion` et interrupteur d'animations | OK | `e2e/accessibilite` « animations : coupées par prefers-reduced-motion et par l'interrupteur du pied de page » |
| Comparaison visuelle avec `captures/` | 68 / 82 écrans du site et de l'espace conformes ; écarts justifiés | `docs/AVANCEMENT.md`, « Alignement visuel » et « Back-office : alignement visuel » |
| Rendu des e-mails dans Gmail et Outlook | Prépro | `int/emails` vérifie le contenu ; le rendu dans les clients reste à faire |

## Anomalies trouvées

| Gravité | Anomalie | État |
|---|---|---|
| Majeure | Discipline : le délai de défense de 15 jours (`docs/05` §5) pouvait être contourné en envoyant une date de fin de défense dans la requête de l'étape (`src/collections/DisciplinaryCases.ts`, fonction `etape`). Même risque pour le délai de recours. Réservé aux administrateurs, mais la règle doit être garantie par le serveur. | Corrigée : le corps de la requête ne peut plus remplacer les dates, délais, état ni historique du dossier. Test `int/recette` « le délai de défense ne peut pas être contourné par le corps de la requête » |
| Mineure | Accessibilité : 47 anomalies graves ou critiques relevées par axe au premier passage (dont 39 dans des composants natifs de Payload). | Corrigées, voir `docs/AVANCEMENT.md` |
| Mineure | Menu mobile : ne se fermait pas avec Échap. | Corrigée |
| Mineure | Fiche membre du back-office : les boutons de la procédure disciplinaire s’affichaient au responsable membres, alors que le serveur les lui refuse (`docs/04`). | Corrigée : boutons masqués pour ce rôle. Question 10 de `docs/QUESTIONS.md` (la maquette les lui montre) |

## Résultats des suites automatiques

À compléter à chaque passage.

| Suite | Résultat (27/10/2026) |
|---|---|
| Tests d'intégration (Vitest), toutes suites | 54 / 54 avant la recette ; `recette` et `cotisations` relancés après la correction de la discipline : 15 / 15 |
| E2E du site, de l'adhésion, de l'annuaire, des événements, des opportunités et de la sécurité | 33 / 33 (au second passage ; les échecs du premier passage étaient des délais dépassés pendant la première compilation des pages) |
| Accessibilité (axe et clavier) | 13 / 14 au dernier passage complet, une anomalie corrigée puis vérifiée ; voir `docs/AVANCEMENT.md` |
| Compilation de production | Réussie depuis un dossier `.next` vidé |
