# Le projet

## REC 242 en quelques lignes

REC 242, Réseau des Entrepreneurs Congolais, est une association loi 1901 créée à Brazzaville le 3 octobre 2026. Elle réunit des entreprenants de l'informel, des commerçants et des entreprises pour s'entraider, se rencontrer et faire des affaires. Sa devise : « Se connecter. Entreprendre. Construire. »

Elle est dirigée par un comité de direction : la fondatrice (Eve) et sept membres répartis en cinq pôles. Des commissions thématiques donnent des avis, deux contrôleurs aux comptes vérifient la gestion. Les textes fondateurs sont dans `sources/` : statuts corrigés, règlement intérieur, charte de l'adhérent, fiche d'adhésion.

Nom de domaine : rec242.cg. Adresse d'envoi : contact@rec242.cg. Siège : 165 rue Charles Foucault, Centre-Ville, Brazzaville. WhatsApp : +242 06 725 79 50.

## Ce qu'on construit

Trois espaces dans une même application :

1. **Le site public** : présentation du réseau, adhésion en ligne avec paiement, annuaire, agenda, opportunités, actualités, presse, contact. 28 écrans.
2. **L'espace membre** : réservé aux membres actifs. Tableau de bord, profil et fiche entreprise, événements, opportunités, annuaire complet, experts, échanges, cotisation et reçus, documents, carte de membre. 13 écrans.
3. **Le back-office** : pour l'équipe de REC 242 et Webtinix. Candidatures, membres, cotisations, événements, commissions, opportunités, demandes des membres, messages, contenus, documents, paramètres, utilisateurs, journal. 22 écrans.

Chaque écran est maquetté sur ordinateur et sur mobile. La majorité des connexions se fait sur smartphone : le mobile n'est pas une version dégradée.

## Les documents de référence

- `sources/cahier-des-charges-client.pdf` : la demande initiale de REC 242.
- `sources/reponses-rec242.pdf` : les arbitrages du client sur les écarts entre statuts et fiche d'adhésion.
- `sources/statuts.docx`, `sources/reglement-interieur.docx`, `sources/charte-adherent.docx`, `sources/fiche-adhesion.docx` : les règles de l'association.
- `sources/cahier-des-charges-webtinix.html` : le cahier des charges détaillé rédigé par Webtinix. Il va plus loin que la maquette sur certains points ; en cas de différence, **la maquette et ce dossier font foi**.

## Décisions déjà prises

| Sujet | Décision |
|---|---|
| Direction artistique | Direction B, « Le Cercle ». Les directions A et C sont abandonnées. |
| CMS | Payload 3, sur Next.js, base PostgreSQL. |
| Back-office | Dans l'admin Payload : vues personnalisées pour les tâches, vues natives habillées pour les contenus. Une seule connexion. |
| Double authentification | Pas dans cette version. Elle est remplacée par un mot de passe de 12 caractères minimum, un blocage après 5 essais, une alerte e-mail à chaque nouvel appareil et un journal des connexions. Le modèle de données doit permettre de l'ajouter plus tard. |
| Plaidoyer | Pas de rubrique Plaidoyer : REC 242 a choisi de s'en tenir à Formalisation et Opportunités B2B. |
| Catégories de membres | A, B, C, Expert, Partenaire, Membre d'honneur. Le candidat coche la catégorie où il se reconnaît. |
| Paiement | Le paiement fait partie du dossier d'adhésion. Paiement en ligne par MTN MoMo et Airtel Money, ou au siège contre reçu. Chaque paiement est tracé et donne un reçu officiel. |
| Pièce d'identité | Vérifiée en main propre lors d'un rendez-vous, pas téléversée. |
| Charte de l'adhérent | Case à cocher en ligne, puis signature physique au rendez-vous. |
| Groupe WhatsApp | La page de remerciement propose la chaîne WhatsApp publique. Le lien du groupe des membres n'est donné qu'après validation, dans l'e-mail de bienvenue et l'espace membre. |
| Langue | Français uniquement. |

## Ce qui n'est pas dans cette version

Double authentification, messagerie libre entre membres (seules les mises en relation et les réponses aux annonces existent), application mobile installable, version anglaise, rubrique Plaidoyer, paiement en ligne des événements payants (le tarif est affiché à titre d'information).
