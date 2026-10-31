# Écrans du back-office

22 écrans, tous dans l'admin Payload (`/admin`). Maquette : `maquette/back-office/?page=…`. Captures : `captures/back-office/`. L'utilisatrice de démonstration est Béryl Bobanda (responsable membres).

## Principe : vue personnalisée ou vue native

- **Vue personnalisée** : composant React déclaré dans `admin.components.views` (ou `views.edit` / `views.list` d'une collection), qui reproduit l'intérieur de l'écran de la maquette au pixel près et passe par l'API locale avec l'utilisateur connecté (les fonctions d'accès s'appliquent).
- **Vue native habillée** : liste et formulaire de Payload, avec les libellés, l'ordre des champs, les colonnes et les filtres de la maquette ; composants de champ personnalisés là où c'est indiqué.

Le menu de gauche est remplacé par `admin.components.Nav` pour reproduire les groupes et les pastilles (nombre d'éléments en attente, calculé côté serveur et rafraîchi toutes les 60 secondes). La barre du haut (titre, recherche globale, utilisateur) est un composant `header` personnalisé.

## Tableau de répartition

| N° | Écran | Route admin | Type | Collection(s) |
|---|---|---|---|---|
| 01 | connexion | `/admin/login` | Native habillée (`beforeLogin`, `afterLogin`, logo, textes) | users |
| 02 | tableau | `/admin` | **Personnalisée** (remplace le tableau de bord) | toutes |
| 03 | candidatures | `/admin/collections/applications` | **Personnalisée** (liste) | applications |
| 04 | candidature | `/admin/collections/applications/[id]` | **Personnalisée** (édition) | applications, payments, auditLog |
| 05 | membres | `/admin/collections/members` | **Personnalisée** (liste à onglets) | members, companies, modificationRequests, directoryAds |
| 06 | membre | `/admin/collections/members/[id]` | **Personnalisée** (édition) | members, companies, dues, disciplinaryCases |
| 07 | evenements | `/admin/collections/events` | **Personnalisée** (cartes) | events, registrations |
| 08 | evenement | `/admin/collections/events/[id]` | **Personnalisée** (onglets Inscrits, Liste d'attente, Fiche, Après l'événement, scan) | events, registrations |
| 09 | actualites | `/admin/collections/news` | Native habillée | news |
| 10 | editeur | `/admin/collections/news/[id]` | Native habillée (onglets Contenu, Référencement, Aperçu ; versions ; aperçu en direct) | news |
| 11 | opportunites | `/admin/collections/opportunities` | **Personnalisée** (liste + panneau de modération) | opportunities |
| 12 | cotisations | `/admin/cotisations` | **Personnalisée** (vue d'admin autonome) | dues, payments |
| 13 | messages | `/admin/collections/contactMessages` | **Personnalisée** (boîte de réception) | contactMessages |
| 14 | contenus | `/admin/contenus` | **Personnalisée** (onglets qui mènent aux listes natives) | pages, navigation, people, faq, partners, media, taxonomies |
| 15 | parametres | `/admin/globals/settings` | Native habillée (onglets) | settings, keyFigures, emailTemplates, SEO par défaut |
| 16 | utilisateurs | `/admin/collections/users` | Native habillée + composant « Matrice des permissions » | users |
| 17 | journal | `/admin/collections/auditLog` | Native habillée, lecture seule, filtres en pastilles | auditLog |
| 18 | documents | `/admin/collections/documents` | Native habillée (colonnes, filtres de rubrique, encadré « documents personnels ») | documents |
| 19 | commissions | `/admin/collections/commissions` | **Personnalisée** (cartes + demandes) | commissions, commissionRequests |
| 20 | opportunite | `/admin/collections/opportunities/[id]` | Native habillée + aperçu en direct de la carte | opportunities |
| 21 | demandes | `/admin/demandes` | **Personnalisée** (boîte de réception à deux onglets) | expertRequests, connectionRequests |
| 22 | page | `/admin/collections/pages/[id]` | Native habillée (blocs, dont le bloc « Antennes ») | pages |

Les écrans en vue native doivent quand même ressembler à la maquette : mêmes intitulés, mêmes colonnes, mêmes badges de statut (composant `Cell` personnalisé), mêmes couleurs (variables CSS de `design/tokens.css` appliquées à l'admin).

## Détail par écran

### 01 Connexion
E-mail, mot de passe, « Se connecter », « Mot de passe oublié ? », texte sur le blocage, l'alerte nouvel appareil et la déconnexion automatique. Pas de double authentification. Chaque connexion, réussie ou non, est inscrite au journal.

### 02 Tableau de bord
Salutation et rôle. Quatre compteurs cliquables (candidatures en attente et ancienneté de la plus ancienne, demandes de modification, messages non traités, opportunités qui expirent dans la semaine). Prochains événements (inscrits / capacité, statut). Messages par motif. « À suivre » (demandes pour rejoindre une commission, questions aux experts sans réponse, membres à 3 relances, encarts à régler). Raccourcis (rédiger une actualité, créer un événement, publier une opportunité, relancer les cotisations).
- Chaque bloc ne montre que ce que le rôle permet de voir ; un bloc sans droit disparaît.

### 03 Candidatures
Filtres en pastilles avec compteurs (Toutes, Reçue, En examen, Complément demandé, Acceptée, Refusée), Exporter (CSV, selon droits), « Saisir une candidature papier » (formulaire complet : mêmes champs que le site, source papier, événement ou passage au siège, bulletin scanné, paiement enregistré à la saisie). Tableau : dossier, candidat (photo, nom, entreprise), catégorie, secteur et ville, ancienneté, paiement, statut, « Ouvrir ». Rappel : les doublons sont bloqués.

### 04 Candidature
En-tête (photo, numéro, ancienneté, nom, entreprise, secteur, ville, catégorie, statut). Colonne gauche : statut du dossier en pastilles (choisir « Refusée » ouvre le motif obligatoire et l'envoi de l'e-mail), « Demander un complément » (e-mail modèle modifiable avant envoi), « Convertir en membre » (crée le membre, voir `05-regles-metier.md` §3) ; dossier (téléphone, e-mail, tranche d'âge, forme juridique, objectifs, connu par, paiement, pièces jointes) ; rendez-vous (trois cases : pièce vérifiée, charte signée, avis de la commission). Colonne droite : notes internes, e-mails modèles (accusé de réception, complément, bienvenue et activation, refus motivé ; chacun s'ouvre en brouillon modifiable puis s'envoie), historique.
- « Convertir en membre » n'est actif que si le statut est « Acceptée », la pièce vérifiée et la charte signée.

### 05 Membres et entreprises
Trois onglets :
- **Fiches** : numéro, entreprise et dirigeant, catégorie, statut, situation de cotisation, annuaire (publique, masquée), « Ouvrir ». Filtres et recherche.
- **Demandes de modification** : membre, champ, ancienne et nouvelle valeur, motif, justificatif ; « Valider » (met à jour la fiche, prévient le membre) ou « Refuser » (motif). Les présentations modifiées en attente de relecture y apparaissent aussi.
- **Import et export** : export CSV et Excel des membres (selon droits) ; import CSV avec aperçu, contrôle des doublons et rapport d'erreurs ; **annuaire imprimé** : édition en cours, date de clôture, membres éligibles (à jour au 30 novembre et consentants), encarts réservés et leur paiement, export pour l'imprimeur (CSV + logos).

### 06 Fiche membre
En-tête (numéro, catégorie, entreprise, dirigeant, cotisation, statut). Statut (Actif, Suspendu, Ancien membre ; tout changement demande une confirmation et un motif). Visibilité dans l'annuaire (lecture des choix du membre ; l'administrateur peut masquer une fiche, pas la publier sans consentement). Fiche (secteurs, ville et quartier, taille, commission ; modifiable par le responsable membres). Compte (activé ou non, dernière connexion, « Renvoyer le lien d'activation »). Cotisation (échéancier, lien vers les cotisations). Discipline (procédures, « Ouvrir une procédure » : griefs, faits, pièces, sanction envisagée ; frise des étapes de l'article 15 avec les dates calculées ; chaque étape s'enregistre et envoie le courrier correspondant). Fin d'adhésion (« Enregistrer une démission » ou un décès ; la fiche quitte l'annuaire, l'historique reste).

### 07 Événements
Compteur, « Créer un événement » (formulaire complet de `events`), cartes : statut, date, titre, inscrits / capacité et taux, « Gérer », « Dupliquer » (copie en brouillon sans inscrits).

### 08 Événement
En-tête (date, titre, inscrits, statut). Onglets :
- **Inscrits** : compteur de présents, « Scanner les cartes de membre » (caméra du téléphone, lecture du QR de la carte ou du billet, résultat vert ou rouge, marche hors connexion avec synchronisation), exports CSV et Excel, tableau participant, profil (membre, visiteur), téléphone, case de présence.
- **Liste d'attente** : ordre, « Promouvoir » manuel, e-mail automatique à la promotion.
- **Fiche** : formulaire complet de l'événement, dont les onglets « Formulaire d'inscription » (questions) et « Aperçu » (statut, annuler ou reporter avec message aux inscrits, « Prévisualiser »).
- **Après l'événement** : compte rendu, nombre de participants, galerie, documents, actualité liée (création d'un brouillon « Retour sur événement »).

### 09 Actualités
Liste : titre, type, auteur, publication, statut (brouillon, en relecture, programmé, publié, archivé), « Rédiger une actualité ».

### 10 Éditeur d'actualité
Enregistrement automatique avec numéro de version, « Programmer » (date et heure), « Publier ». Onglets Contenu (titre, chapeau, corps en blocs : texte, image avec texte alternatif obligatoire, chiffres clés, cartes, FAQ, appel à l'action), Référencement, Aperçu. Panneau latéral : type, secteurs, tags, date, « Réservé aux membres », liaisons (événement), historique des versions avec « Restaurer ». Un éditeur peut envoyer en relecture mais pas publier (droits).

### 11 Opportunités
Règle de la date limite, « Publier une opportunité ». Tableau : titre, type, visibilité, date limite, statut (publiée, expire dans N jours, à modérer, expirée), « Modifier ». Panneau « À modérer » pour l'annonce sélectionnée : auteur et situation de cotisation, texte, secteur, visibilité, date limite, vérifications (date limite, pas de coordonnées détectées automatiquement par expression régulière, conformité à confirmer), actions Publier, Demander une modification (message), Refuser (motif).

### 12 Cotisations
Quatre compteurs (à jour, échéance à venir, en relance, montant encaissé sur l'exercice). Filtres. « Export comptable » (CSV des paiements), « Enregistrer un paiement » (membre, objet, montant, mode, référence ou numéro de souche, date ; génère le reçu), « Envoyer les relances dues » (seulement celles dont le délai de 15 jours est écoulé ; confirmation avec la liste). Tableau des échéances : membre, catégorie, échéance, limite, relances n/3, statut, « Constater la perte » à 3/3 (date du comité et référence du procès-verbal obligatoires). Paiements reçus avec lien vers le reçu PDF. Rappel de la règle.

### 13 Messages
Filtres par motif, export. Boîte de réception : liste (nom, date, objet, motif, statut) et message ouvert (motif, source, statut, expéditeur et coordonnées, transmis à, texte). Répondre par e-mail ou WhatsApp (réponses types, texte modifiable, « Marquer comme traité après l'envoi ») ; en WhatsApp version 1, le bouton ouvre `wa.me` avec le texte et enregistre la réponse. « Transmettre » (à un utilisateur ou un rôle, avec un mot). « Ajouter une note interne ». Rappel du routage.

### 14 Pages, menus et médias
Onglets qui donnent accès aux listes natives : Pages (statut, mise à jour, Modifier, Prévisualiser), Menus (global `navigation`, glisser-déposer, sept entrées maximum), Gouvernance et experts (`people`, étiquettes, ordre ; onglets Profil et Aperçu pour la fondatrice et le comité de direction), FAQ, Partenaires, Médias, Taxonomies (secteurs, localités, types d'événements, étiquettes d'expertise).

### 15 Paramètres
Onglets : Coordonnées (adresse, e-mail, horaires, réseaux sociaux, plan d'accès), WhatsApp (numéro, chaîne, groupe des membres ; modifier le lien du groupe est journalisé), Chiffres clés (quatre au plus, saisi ou calculé), Tarifs (droit d'adhésion et cotisation par catégorie, délai et relances, édition de l'annuaire imprimé, date de clôture, tarifs des encarts ; réservé aux administrateurs, journalisé ; un changement ne touche jamais une échéance déjà émise), E-mails automatiques (adresse d'alerte des candidatures et copie, adresse d'envoi, les modèles de `09-emails-et-notifications.md`), Référencement (titre et description par défaut, image de partage, redirections).

### 16 Utilisateurs et rôles
Rappel des règles de mot de passe. « Inviter un utilisateur » (nom, e-mail, rôles ; e-mail d'invitation avec lien de création du mot de passe). Tableau : utilisateur, rôle, dernière connexion, statut (actif, invitation envoyée, désactivé), « Désactiver ». Matrice des permissions (composant en lecture, générée depuis la configuration des droits, avec sélecteur de rôle mis en évidence). Seul le super administrateur modifie les rôles.

### 17 Journal des actions
Filtres (toutes, validations, publications, exports, paramètres, connexions, paiements, discipline), « Exporter le journal », entrées : action, date, auteur, ville. Aucune entrée n'est modifiable ni supprimable, même par un super administrateur.

### 18 Documents
Filtres de rubrique avec compteurs, « Déposer un document ». Tableau : document (miniature), rubrique, visibilité, version, mise à jour, téléchargements, « Modifier » (nouvelle version, changement de visibilité, annonce aux membres). Encadré des documents personnels générés automatiquement avec leurs compteurs.

### 19 Commissions
Rappel de l'article 17, « Créer une commission ». Demandes pour rejoindre (membre, commission, ce qu'il apporte ; Accepter ou Refuser, le membre est prévenu). Une carte par commission : ouverture, objet, responsable, nombre de membres, experts rattachés, prochaine réunion, « Modifier » (formulaire `commissions`, liste des membres avec retrait).

### 20 Publier une opportunité
Type, visibilité, titre, description, secteurs, date limite (obligatoire), source officielle (obligatoire pour un appel d'offres relayé), comment répondre, pièce jointe, « Prévenir les membres des secteurs concernés », « Mettre en avant sur l'accueil » (public seulement), « Enregistrer le brouillon », « Publier ». Aperçu en direct de la carte. Rappel des règles.

### 21 Demandes des membres
Deux onglets avec boîte de réception :
- **Questions aux experts** : liste (membre, date, question, étiquette, statut, en rouge si sans réponse après 5 jours ouvrés), détail (membre → personne sollicitée, question, préférence, fil avec événements système), actions : Relancer l'expert, Réattribuer (choix parmi les porteurs de l'étiquette), Répondre au membre (au nom de REC 242), Clôturer.
- **Mises en relation** : suivi en lecture (demandeur, membre contacté, statut), signalements à traiter, suspension d'un membre qui dépasse le plafond.

### 22 Modifier une page
Enregistrement automatique et version, Prévisualiser, Publier. Blocs réordonnables (en-tête, texte, image, chiffres clés, cartes, FAQ, témoignages, logos, appel à l'action, antennes). Bloc Antennes : une ligne par antenne (ville, statut actif, en création, en projet, référent, contact), ajout. Panneau : adresse, statut, menu, référencement, historique avec « Restaurer ».
