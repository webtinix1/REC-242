# Modèle de données (collections Payload)

Noms techniques en anglais, libellés de l'admin en français. Toutes les collections ont `createdAt` et `updatedAt`. Les champs marqués « obligatoire » le sont côté serveur. Les données de démonstration sont dans `seed/`.

## Comptes

### `users` : équipe d'administration (authentification)
nom, e-mail, photo, rôle (voir `04-roles-et-droits.md`, plusieurs rôles possibles), statut (actif, invitation envoyée, désactivé), dernière connexion, appareils connus (empreinte navigateur et ville, pour l'alerte « nouvel appareil »), `twoFactor` (réservé, vide).

### `members` : membres (authentification)
civilité, nom, prénom, fonction dans l'entreprise, téléphone (format international, +242 par défaut), WhatsApp, e-mail (identifiant), tranche d'âge (18-25, 26-35, 36-45, 46 et plus), photo, entreprise (relation `companies`), catégorie (A, B, C, Expert, Partenaire, Membre d'honneur), numéro d'adhérent (REC-AAAA-NNNN, attribué à l'activation), statut (en attente d'activation, actif, suspendu, ancien membre), date d'adhésion (sert de date anniversaire de la cotisation), validité de la carte (veille de la prochaine date anniversaire), candidature d'origine (relation `applications`), commissions (relation), préférences de notification (rappels d'événements, opportunités de mes secteurs, réponses et mises en relation, échéances de cotisation, lettre d'information), consentement annuaire (date), dernière connexion.

## Adhésion

### `applications` : candidatures
- Numéro de dossier (C-0042), source (en ligne, bulletin papier ; pour le papier : événement ou passage au siège, fichier du bulletin scanné).
- Étape « Vous » : civilité, fonction, nom, prénom, téléphone, e-mail, tranche d'âge, numéro de pièce d'identité.
- Étape « Votre entreprise » : raison sociale ou nom du projet, forme juridique (activité informelle, entreprise individuelle, SARL, SA, autre), RCCM, année de création, tranche d'effectif (porteur de projet, 1 à 9, 10 à 49, 50 et plus), localisation (taxonomie localités), quartier, description de l'activité (obligatoire), compétences ou services proposés au réseau, secteurs (1 à 3, taxonomie).
- Étape « Votre projet » : ancienneté (porteur de projet, moins d'un an, 1 à 3 ans, 3 à 5 ans, plus de 5 ans), objectifs (au moins un : développer un projet, formations, activités et afterworks, opportunités d'affaires, visibilité, formalisation), comment avez-vous connu REC 242, parrain, catégorie.
- Étape « Paiement » : modalité (une fois, deux tranches), mode (paiement mobile, au siège), opérateur, numéro payeur. Aucune de ces données pour Partenaire et Membre d'honneur (sur convention).
- Étape « Validation » : pièces justificatives (PDF, JPG, PNG, 5 Mo), autorisations (annuaire, coordonnées aux membres, logo, portrait), consentement au traitement des données (obligatoire), acceptation des statuts, du règlement et de la charte (obligatoire).
- Suivi : statut (reçue, en examen, complément demandé, acceptée, active, refusée, archivée), responsable attribué, motif de refus, rendez-vous (date), pièce d'identité vérifiée, charte signée, avis de la commission Éthique et Vérification, notes internes (auteur, date, texte), historique des changements (date, auteur, action), membre créé (relation).

### `payments` : paiements et reçus
numéro de reçu (PAY-0001, séquence sans trou), membre ou candidature, objet (droit d'adhésion, cotisation tranche 1, tranche 2, cotisation en totalité, encart dans l'annuaire imprimé), exercice, montant (FCFA, entier), mode (MTN MoMo, Airtel Money, espèces au siège, virement), statut (en attente, payé, échoué, remboursé), référence opérateur ou numéro de souche ou référence de virement, date, reçu PDF, enregistré par (utilisateur, si saisie manuelle).

### `dues` : cotisations (une par membre et par exercice)
membre, exercice (de la date d'adhésion à la veille de la date anniversaire suivante), catégorie, droit d'adhésion (première année seulement), montant de la cotisation, tranches (montant, échéance, paiement lié, statut), date limite (3 mois après le début de l'exercice), relances (date, canal, numéro 1 à 3), statut (à jour, à venir, en relance, perte constatée), date du constat et procès-verbal.

### `modificationRequests` : demandes de modification de fiche
membre, champ (nom et prénom, raison sociale, secteurs, ville et quartier, téléphone, e-mail), valeur actuelle, nouvelle valeur, motif, justificatif, statut (en attente, validée, refusée), traitée par, date de traitement.

### `disciplinaryCases` : procédures disciplinaires
numéro (D-2026-001), membre, griefs (non-respect de la charte, des statuts ou du règlement, activité illicite ou pyramidale, escroquerie, vol ou détournement, autre faute grave), faits, pièces, sanction envisagée puis prononcée (rappel à l'ordre verbal, avertissement écrit, suspension de 1 à 6 mois avec durée, exclusion), dates (notification des griefs, fin du délai de défense à J+15, avis de la commission, décision, fin du délai de recours à J+30), défense du membre, avis de la commission, décision motivée, recours, statut.

## Activité

### `events` : événements
titre, slug, type (taxonomie), commission organisatrice, secteurs, description, date et heure de début et de fin, format (sur place, visioconférence, lieu communiqué aux inscrits), nom du lieu, ville, adresse, lien de carte ou de visioconférence, capacité, accès (ouvert à tous, réservé aux membres, sur invitation), tarif (gratuit ou payant, montant indicatif), clôture des inscriptions, liste d'attente automatique, rappel la veille, billet avec QR code, image principale, documents (fichier et visibilité : tous ou inscrits), programme (heure, intitulé), intervenants (nom, fonction, photo ou membre lié), statut (brouillon, publié, complet, annulé, reporté, terminé), compte rendu, nombre de participants (affiché seulement s'il est renseigné), galerie (images avec texte alternatif), actualité liée. Questions du formulaire d'inscription : libellé, type, aide, obligatoire, public, choix.

### `registrations` : inscriptions
événement, membre (si connecté) ou visiteur (nom, e-mail, téléphone, entreprise), statut (inscrit, liste d'attente avec position, annulé, présent), numéro de billet (B-JJMM-NNN), jeton du QR code, pointé le, pointé par. Réponses au formulaire : question, libellé recopié, réponse, fichier joint (`inscriptionFichiers`).

### `opportunities` : opportunités
type (appel à partenariat, événement partenaire, appel d'offres relayé, financement, rencontre B2B ou mission, offre entre membres), titre, description, secteurs, visibilité (public, membres actifs), date limite (obligatoire), source officielle (lien, obligatoire pour un appel d'offres relayé) et libellé, comment répondre, pièce jointe, auteur (REC 242 ou membre), statut (brouillon, à modérer, modification demandée, publiée, refusée, expirée), message de modération, mise en avant sur l'accueil (public seulement), prévenir les membres des secteurs concernés.

### `opportunityReplies` : réponses aux annonces
opportunité, membre qui répond, message, pièce jointe, date, lue.

### `commissions`
nom, slug, objet, responsable (relation `people`), ouverture (ouverte aux membres actifs, sur désignation), étiquettes liées, prochaine réunion, membres (relation `members`), affichée sur le site, ordre.

### `commissionRequests` : demandes pour rejoindre une commission
membre, commission, ce que le membre peut apporter, statut (en attente, acceptée, refusée), traitée par.

### `people` : gouvernance et experts
nom, photo, fonction, rôle (fondatrice, comité de direction, expert), pôle (numérique et données, juridique, programme et relations avec les adhérents, communication et stratégie, relations extérieures), membre lié (pour un expert), étiquettes d'expertise, ordre d'affichage, visible sur le site, adresse (`slug`, tirée du nom).

Profil public du comité (fondatrice et comité de direction, pas les experts) : surtitre, lieu, présentation, chiffres clés (valeur, libellé ; quatre au plus), rubriques (titre, présentation en chronologie ou en cartes, entrées : période, lieu, titre, organisation, description, points clés), compétences (titre, texte), domaines et outils. L'e-mail de la fiche reste réservé à l'équipe et n'apparaît jamais sur le profil.

### `expertRequests` : questions aux experts
membre, étiquette, personne sollicitée, question, préférence de réponse (WhatsApp, e-mail, rendez-vous au siège), statut (envoyée, transmise, en cours, répondue, sans réponse, réattribuée, clôturée), fil des messages (auteur, date, texte), relances, réattributions.

### `connectionRequests` : mises en relation
demandeur (membre), membre contacté, objet, message, statut (en attente, acceptée, refusée, annulée, signalée), date de réponse, fil des messages. Les coordonnées ne sont partagées qu'au statut « acceptée ».

### `contactMessages` : messages des formulaires
formulaire (contact, partenariat), motif (adhésion, partenariat, presse, événement, autre), nom, organisation, téléphone, e-mail, message, type de partenariat (formulaire partenariat), transmis à (rôle ou utilisateur, selon le motif), statut (à traiter, traité, archivé), notes internes, réponses envoyées (canal e-mail ou WhatsApp, texte, auteur, date).

### `networkMessages` : messages du réseau aux membres
membre (ou tous), titre, texte, lien, lu le. Alimente l'onglet « Messages du réseau » de l'espace membre.

## Contenus

### `pages`
titre, slug, blocs (en-tête, texte, image, chiffres clés, cartes, FAQ, appel à l'action, témoignages, logos, antennes), menu, référencement, versions et brouillons. Les pages institutionnelles de la maquette ont des mises en page très spécifiques : les coder comme gabarits dont les textes et les listes viennent de blocs ou de champs, plutôt qu'un constructeur libre.

### `news` : actualités
titre, slug, chapeau, corps (texte riche), image principale et texte alternatif (obligatoire), type (article, communiqué, interview, annonce, retour sur événement), secteurs, étiquettes, auteur, date de publication (programmable), réservée aux membres (le visiteur voit le chapeau), événement lié, PDF (pour un communiqué), référencement, statut (brouillon, programmé, publié, archivé), versions.

### `documents`
titre, rubrique (textes officiels, vie du réseau, ateliers et formations, presse, événements), visibilité (public, membres actifs, inscrits à un événement donné, comité de direction), fichier PDF, couverture générée, version, historique des versions, date du document, nombre de téléchargements, annoncé aux membres.

### `media`
image, texte alternatif (obligatoire pour publier), visibilité, crédits.

### `partners`
nom, logo, lien, type de partenariat, description, convention signée (n'apparaît sur le site qu'à « oui »), ordre.

### `faq`
question, réponse, emplacements (accueil, adhérer), ordre, visible.

### `testimonials`
citation, personne, entreprise, photo, accord de publication.

### `directoryAds` : encarts de l'annuaire imprimé
édition, membre, format (insertion standard, encart logo agrandi, demi-page, pleine page), montant, paiement lié, statut.

### Taxonomies
`sectors` (agriculture, commerce, numérique, BTP, services, santé, formation, immobilier, transport, artisanat), `localities` (Brazzaville, Pointe-Noire, Dolisie, Nkayi, Ouesso, Diaspora / Autre), `eventTypes` (afterwork, atelier, masterclass, rencontre B2B, conférence, déjeuner d'affaires, formation, assemblée), `expertiseTags` (formalisation, juridique, fiscalité, financement, numérique, données, communication, stratégie, partenariats, institutions, accompagnement, agriculture, BTP, immobilier, formation, ressources humaines, entrepreneuriat, réseau), `contentTypes` (fixe).

### `auditLog` : journal des actions
date, auteur (utilisateur, membre ou système), catégorie (connexion, validation, publication, export, paramètres, paiement, discipline), action, cible, adresse IP et ville. Écrit par des hooks, jamais modifiable.

## Globals

- `settings` : adresse du siège, e-mail de contact, horaires, réseaux sociaux, numéro WhatsApp, lien de la chaîne, lien du groupe des membres, adresse d'alerte des candidatures (Rec242.Contact@gmail.com) et copie, adresse d'envoi, plan d'accès (coordonnées GPS).
- `keyFigures` : jusqu'à quatre chiffres clés. Chacun est soit saisi à la main, soit calculé (membres actifs, entreprises représentées, secteurs représentés). Un chiffre vide n'apparaît pas.
- `navigation` : menu principal (sept entrées au maximum) et pied de page.
- `pricing` : droit d'adhésion et cotisation par catégorie (A, B, C, Expert), délai pour solder (3 mois), nombre de tranches (2), nombre de relances (3) et intervalle minimal (15 jours). Une `dues` copie les montants au moment où elle est créée : changer un tarif ne modifie jamais une échéance émise.
- `directoryEdition` : édition en cours de l'annuaire imprimé, date de clôture, tarifs des encarts.
- `emailTemplates` : objets et textes des e-mails automatiques (voir `09-emails-et-notifications.md`).
