# Écrans de l'espace membre

13 écrans, sous `/espace-membre`. Maquette : `maquette/espace-membre/?page=…`. Captures : `captures/espace-membre/`. Le membre de démonstration est Christelle Malonga (Kimia Créations, catégorie B, REC-2026-0137).

Toutes les routes sauf la connexion exigent une session `members` au statut actif. Un membre ne lit et ne modifie que ses propres données (fonctions d'accès Payload, pas seulement l'interface).

## Éléments communs

- **Barre latérale** (ordinateur) : avatar, nom, entreprise et catégorie, numéro d'adhérent, statut ; menu Accueil, Mes événements, Opportunités, Annuaire, Experts, Mes échanges (pastille du nombre de non-lus), Cotisation, Documents, Ma carte, Mon profil ; Retour au site, Se déconnecter.
- **Mobile** : barre d'onglets en bas (Accueil, Événements, Opportunités, Échanges, Plus) et menu « Plus » pour le reste. Cibles tactiles de 44 px au moins.
- **Toasts** pour chaque action réussie, messages d'erreur clairs sous les champs.
- **Session** : 30 minutes d'inactivité, ou 30 jours avec « Rester connecté ». À l'expiration, retour à la connexion avec le message « Session expirée » et retour à la page demandée après reconnexion.

## Tableau des écrans

| N° | Écran | Route | Données |
|---|---|---|---|
| 01 | connexion | `/espace-membre/connexion` (+ `/mot-de-passe-oublie`, `/activation/[jeton]`) | members |
| 02 | tableau | `/espace-membre` | members, dues, registrations, opportunities, connectionRequests, expertRequests, opportunityReplies, news, settings |
| 03 | profil | `/espace-membre/profil` | members, companies, modificationRequests, commissions, commissionRequests |
| 04 | evenements | `/espace-membre/evenements` | registrations, events |
| 05 | opportunites | `/espace-membre/opportunites` (+ `/[id]`) | opportunities, opportunityReplies |
| 06 | publier | `/espace-membre/opportunites/publier` | opportunities |
| 07 | annuaire | `/espace-membre/annuaire` | members, companies |
| 08 | fiche | `/espace-membre/annuaire/[slug]` | companies, connectionRequests |
| 09 | experts | `/espace-membre/experts` | people, expertiseTags, expertRequests |
| 10 | messages | `/espace-membre/echanges` | connectionRequests, opportunityReplies, expertRequests, networkMessages |
| 11 | cotisation | `/espace-membre/cotisation` | dues, payments |
| 12 | documents | `/espace-membre/documents` | documents, payments, settings |
| 13 | carte | `/espace-membre/carte` | members |

## Détail par écran

### 01 Connexion
Six états, présentés dans la maquette par un sélecteur « Démo » (à ne pas reproduire) :
- **Connexion** : e-mail, mot de passe (10 caractères minimum), « Rester connecté 30 jours sur cet appareil », « Mot de passe oublié ? », « Recevoir un lien par e-mail » (connexion par lien unique, valable 15 minutes), lien vers l'adhésion, retour au site.
- **Mot de passe oublié** : e-mail, envoi d'un lien valable 1 heure. Réponse identique que l'adresse existe ou non.
- **Activation** : arrivée par le lien de l'e-mail de bienvenue (72 h) ; choix et confirmation du mot de passe, indicateur de robustesse. Lien expiré : message et bouton « Recevoir un nouveau lien ».
- **En attente** : candidature pas encore validée ; rappel du numéro de dossier et contact.
- **Suspendu** (ou ancien membre) : accès refusé, invitation à contacter le secrétariat.
- **Session expirée** : message, formulaire de connexion.
- Blocage 15 minutes après 5 essais, avec un message qui le dit.

### 02 Tableau de bord
Salutation, statut, ancienneté, jauge de complétude du profil (calculée sur les champs remplis), « À faire » (actions générées : compléter la fiche, payer une tranche, confirmer une présence ; chacune avec son bouton), prochains rendez-vous (avec statut d'inscription ou position en liste d'attente), trois opportunités de ses secteurs avec compte à rebours, carte récapitulative (numéro, reste à payer), lien du groupe WhatsApp des membres, encart « Mes échanges » avec le nombre de réponses en attente, encart experts, deux actualités réservées.
- Fini quand : chaque bloc est alimenté par les données du membre connecté ; un bloc vide affiche un message court au lieu de disparaître (sauf « À faire » qui disparaît quand tout est fait).

### 03 Mon profil
- Photo et logo (téléversement, recadrage carré, WebP), jauge de complétude.
- **Ce que vous modifiez vous-même** : présentation, services proposés, site, LinkedIn, Facebook ; bouton « Enregistrer ». La présentation est relue par le secrétariat avant publication (champ « en relecture » côté back-office).
- **Informations vérifiées** : nom et prénom, raison sociale, secteurs, ville et quartier, téléphone, e-mail, en lecture seule ; « Demander une modification » ouvre un formulaire (champ, nouvelle valeur, motif, justificatif) qui crée une `modificationRequest`.
- **Mes demandes** : historique avec statut (en attente, validée par…, refusée avec motif).
- **Visibilité** : cinq interrupteurs (annuaire public, téléphone, WhatsApp, e-mail aux membres, mise en avant). Désactiver l'annuaire retire la fiche immédiatement.
- **Mes commissions** : commissions dont il est membre (prochaine réunion), demandes en attente, « Rejoindre une autre commission » (choix parmi les commissions ouvertes, texte « ce que je peux apporter »). Mention pour Éthique et Vérification.
- **Notifications** : cinq préférences avec leur canal.
- **Sécurité** : changer le mot de passe (ancien, nouveau, confirmation), se déconnecter de tous les appareils, dernière connexion.
- **Mes données** : télécharger ses données (JSON ou PDF), demander la suppression du compte (confirmation, vaut démission, traitée par le back-office).

### 04 Mes événements
Onglets À venir et Passés. Mes inscriptions : statut (inscrit, liste d'attente avec position, présent, annulé), « Mon billet » (QR code en grand, numéro B-JJMM-NNN), « Ajouter au calendrier (.ics) », « Annuler mon inscription » (confirmation ; libère la place et promeut la liste d'attente). Prochains rendez-vous du réseau avec « M'inscrire en un clic ». Passés : documents réservés aux inscrits, compte rendu.

### 05 Opportunités
Bandeau de publication, filtres par type, cartes (type, visibilité, « Expire bientôt » à 7 jours, titre, secteur, source, date limite). Actions : « Voir le détail » (panneau ou page avec description complète, pièce jointe, comment répondre), « Consulter l'avis officiel » (lien de la source), « Me faire aider » (ouvre une demande à un expert préremplie avec l'opportunité), « Répondre » pour une offre entre membres (message et pièce jointe → `opportunityReplies`, l'auteur est prévenu). Une annonce de l'utilisateur porte « Votre annonce » et n'a pas de bouton de réponse.
**Mes publications** : statut (à modérer, modification demandée avec le message du modérateur, publiée, refusée avec motif, expirée), nombre de réponses, « Lire les réponses » (vers Mes échanges), « Modifier », « Republier » pour une annonce expirée (nouvelle date limite, repasse en modération).

### 06 Publier une opportunité
Trois étapes : 1. Description (type, titre, description, secteur) ; 2. Visibilité et date limite (membres ou public, date limite obligatoire et future, pièce jointe, comment répondre) ; 3. Relecture (aperçu de la carte, rappel des règles : pas de coordonnées dans le texte, relecture avant publication). Envoi → statut « À modérer », toast, retour à la liste.

### 07 Annuaire
Recherche, filtres secteur et ville, compteur, cartes avec dirigeant et coordonnées selon le choix de chaque membre (« Masqué par le membre » sinon), catégorie et taille, lien vers la fiche. Un membre qui n'a pas consenti à l'annuaire n'apparaît pas.

### 08 Fiche membre
Nom, secteur, ville et quartier, catégorie, statut, présentation, informations réservées (dirigeant, quartier, taille, commission, coordonnées selon les choix du membre). Formulaire « Demander une mise en relation » (message) → `connectionRequests` ; le membre contacté est prévenu ; plafond de 10 demandes par semaine. Bouton « Signaler » discret.

### 09 Experts
Trois étapes sur une page : 1. domaine (étiquettes) ; 2. personnes qui portent l'étiquette (comité et experts, avec badge) ; 3. demande (question, préférence de réponse : WhatsApp, e-mail, rendez-vous au siège). Envoi → `expertRequests`, toast. Rappel « réponse sous 5 jours ouvrés ». **Mes demandes** : statut, « Ouvrir » (fil de la demande dans Mes échanges, onglet Experts).

### 10 Mes échanges
Boîte de réception à deux colonnes (une seule colonne sur mobile, avec retour à la liste). Onglets avec compteur de non-lus : Mises en relation, Réponses à mes annonces, Experts, Messages du réseau.
- Liste : avatar, nom, date, objet, statut (acceptée, à votre décision, refusée, en attente…).
- Conversation : contexte (d'où vient l'échange), bulles, zone de réponse.
- Mise en relation reçue : boutons « Accepter » (les coordonnées choisies par le membre sont partagées dans le fil) et « Refuser » (sans motif).
- Réponse à une annonce : répondre, marquer comme traitée.
- Expert : fil de la demande, clôture par le membre.
- Messages du réseau : lecture seule.
- Mention : les coordonnées ne sont échangées que si le membre contacté accepte. Prévenu par e-mail (et WhatsApp quand l'API sera disponible).
- Ce n'est pas une messagerie libre : on ne peut écrire que dans un fil ouvert par une mise en relation, une réponse à une annonce ou une demande à un expert.

### 11 Cotisation
Catégorie et montants, jauge « % réglé », reste à payer, bouton « Payer la 2e tranche » (ou « Payer ma cotisation ») qui ouvre le paiement mobile (opérateur, numéro, validation sur le téléphone, attente de confirmation, succès ou échec avec nouvel essai). Échéancier (droit d'adhésion, tranches, statut). Rappel des règles. Renouvellement (date anniversaire, montant de l'année suivante). Mes reçus (numéro, mode, date, montant, PDF).

### 12 Documents
Liste des documents visibles par ce membre : public, membres, inscrits aux événements auxquels il est inscrit, personnels (charte signée, reçus). Badge de visibilité, téléchargement par la route protégée. Lien du groupe WhatsApp. Contact du secrétariat.

### 13 Ma carte
Carte : statut, photo ou initiales, nom, entreprise, catégorie, numéro, « Valable jusqu'au » (veille de la date anniversaire), QR code (jeton signé, vérifiable au scan de l'écran Événement du back-office). Bouton pour agrandir le QR, « Télécharger en PDF ». Carte d'un membre en relance : badge « Cotisation en retard » ; suspendu : pas d'accès.
