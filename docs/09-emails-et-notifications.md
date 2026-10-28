# E-mails et notifications

## Principes

- Expéditeur : « REC 242 » <contact@rec242.cg> (adresse d'envoi des paramètres). Réponse vers la même adresse.
- Gabarit HTML unique : logo, couleurs de `design/tokens.css`, texte en 16 px, un seul bouton principal, pied avec adresse du siège, WhatsApp et lien vers la politique de confidentialité. Version texte brut systématique.
- Objets et textes modifiables dans le back-office (global `emailTemplates`, onglet « E-mails automatiques » des paramètres). Variables entre doubles accolades, listées sous chaque modèle. Les textes ci-dessous sont les textes par défaut ; ils sont à relire par REC 242.
- Chaque envoi est tracé (destinataire, modèle, date, statut d'envoi) et visible dans l'historique de l'élément concerné (dossier, membre, événement).
- Canal WhatsApp : la maquette annonce certains envois « par e-mail et WhatsApp ». Tant que l'API WhatsApp Business n'est pas en place (voir `02-architecture.md`), seul l'e-mail part ; le code passe par une fonction `notify(canal, modele, destinataire, variables)` pour brancher WhatsApp plus tard sans toucher aux appels.
- Les préférences de notification du membre (profil) sont respectées, sauf pour les e-mails obligatoires : sécurité, paiement, relances, décisions sur l'adhésion et la discipline.
- Ton : vouvoiement, phrases courtes, pas de jargon. Signature : « L'équipe de REC 242 ».

## Liste des modèles

| N° | Modèle | Déclencheur | Destinataire | Désactivable |
|---|---|---|---|---|
| 1 | Confirmation de candidature | Envoi du formulaire de candidature | Candidat | Non |
| 2 | Alerte nouvelle candidature | Même déclencheur | Adresse d'alerte et copie (paramètres) | Non |
| 3 | Complément demandé | « Demander un complément » | Candidat | Non |
| 4 | Bienvenue et activation | « Convertir en membre » | Nouveau membre | Non |
| 5 | Refus motivé | Statut « Refusée » | Candidat | Non |
| 6 | Confirmation d'inscription | Inscription à un événement (ou mise en liste d'attente) | Inscrit | Non |
| 7 | Place libérée | Promotion depuis la liste d'attente | Inscrit promu | Non |
| 8 | Rappel la veille | Tâche quotidienne, J-1 à 10 h | Inscrits | Oui (membres) |
| 9 | Événement annulé ou reporté | Changement de statut de l'événement | Inscrits et liste d'attente | Non |
| 10 | Échéance de cotisation | J-30 et J-7 avant la date anniversaire ; J-15 avant la limite d'une tranche | Membre | Oui |
| 11 | Relance de cotisation | « Envoyer les relances dues » (1re, 2e, 3e) | Membre | Non |
| 12 | Reçu de paiement | Paiement confirmé ou enregistré | Membre ou candidat, PDF joint | Non |
| 13 | Constat de perte de la qualité | « Constater la perte » | Membre | Non |
| 14 | Demande à un expert | Envoi d'une question ; relance à 5 jours ouvrés | Personne sollicitée | Non |
| 15 | Mise en relation | Demande reçue ; réponse (acceptée, refusée) | Membre contacté, puis demandeur | Oui |
| 16 | Réponse à une annonce | Nouvelle réponse | Auteur de l'annonce | Oui |
| 17 | Décision de modération | Publier, demander une modification, refuser | Auteur de l'annonce | Non |
| 18 | Demande de modification traitée | Valider ou refuser | Membre | Non |
| 19 | Procédure disciplinaire | Notification des griefs, décision | Membre | Non |
| 20 | Réinitialisation du mot de passe | Demande depuis la connexion (membre ou administrateur) | Titulaire du compte | Non |
| 21 | Connexion depuis un nouvel appareil | Connexion d'un administrateur depuis un appareil inconnu | Administrateur | Non |
| 22 | Invitation à l'administration | « Inviter un utilisateur » | Nouvel utilisateur | Non |

Autres envois : accusé de réception des formulaires de contact et de partenariat (modèle 23, même gabarit), alerte de l'équipe pour un message (selon le réglage « Alertes aussi pour »), annonce d'un nouveau document aux membres (modèle 24, si coché), alerte « opportunité de mes secteurs » (modèle 25, préférence du membre), lien de connexion par e-mail (modèle 26, valable 15 minutes).

## Textes par défaut

### 1. Confirmation de candidature
Objet : Votre candidature à REC 242 est bien reçue ({{numero_dossier}})
> Bonjour {{prenom}},
> Nous avons bien reçu votre candidature pour {{entreprise}}, en catégorie {{categorie}}. Votre numéro de dossier : {{numero_dossier}}.
> La suite : l'équipe vous contacte sur WhatsApp pour fixer un rendez-vous avec le comité de direction. Pensez à apporter votre pièce d'identité ; vous signerez la charte de l'adhérent sur place.
> Paiement : {{situation_paiement}}.
> Délai habituel de réponse : 10 jours ouvrés.
> Une question ? Répondez à cet e-mail ou écrivez-nous sur WhatsApp au {{whatsapp}} en rappelant votre numéro de dossier.
> En attendant, suivez la chaîne WhatsApp de REC 242 : {{lien_chaine}}

### 2. Alerte nouvelle candidature
Objet : Nouvelle candidature {{numero_dossier}} : {{entreprise}} ({{categorie}})
> {{prenom}} {{nom}}, {{entreprise}}, {{secteurs}}, {{ville}}. Paiement : {{situation_paiement}}.
> Ouvrir le dossier : {{lien_back_office}}
(Pas de données personnelles au-delà de celles-ci dans l'e-mail.)

### 3. Complément demandé
Objet : Votre dossier {{numero_dossier}} : un complément est nécessaire
> Bonjour {{prenom}},
> Pour poursuivre l'examen de votre dossier, nous avons besoin de : {{complement}}.
> Vous pouvez répondre à cet e-mail avec le document, ou nous l'apporter au siège.

### 4. Bienvenue et activation
Objet : Bienvenue dans REC 242, activez votre espace membre
> Bonjour {{prenom}},
> Le comité de direction a validé votre adhésion. Bienvenue dans le réseau.
> Votre numéro d'adhérent : {{numero_adherent}}.
> Créez votre mot de passe pour accéder à votre espace (lien valable 72 heures) : {{lien_activation}}
> Dans votre espace : votre carte de membre avec QR code, votre fiche dans l'annuaire, les opportunités réservées, votre cotisation et vos reçus.
> Rejoignez le groupe WhatsApp des membres : {{lien_groupe}}. Ce lien est réservé aux membres, merci de ne pas le partager.

### 5. Refus motivé
Objet : Votre candidature à REC 242
> Bonjour {{prenom}},
> Le comité de direction a examiné votre candidature et ne peut pas y donner une suite favorable pour le moment. Motif : {{motif}}.
> {{texte_remboursement}}
> Vous pouvez nous écrire pour en parler ou déposer une nouvelle candidature plus tard.

### 6. Confirmation d'inscription
Objet : Inscription confirmée : {{evenement}}, le {{date}}
> Vous êtes inscrit(e) à {{evenement}}, le {{date}} à {{heure}}, {{lieu}}.
> Votre billet : {{lien_billet}} (numéro {{numero_billet}}). Présentez le QR code à l'entrée.
> Ajouter à votre agenda : fichier joint (.ics).
> Vous ne pouvez plus venir ? Annulez pour libérer votre place : {{lien_annulation}}
Variante liste d'attente : « L'événement est complet. Vous êtes en position {{position}} sur la liste d'attente. Nous vous écrivons dès qu'une place se libère. »

### 7. Place libérée
Objet : Une place s'est libérée pour {{evenement}}
> Bonne nouvelle : une place s'est libérée et elle est à vous. Votre billet : {{lien_billet}}.

### 8. Rappel la veille
Objet : C'est demain : {{evenement}}
> Rendez-vous demain à {{heure}}, {{lieu}}. {{indications_acces}}
> Votre billet : {{lien_billet}}.

### 9. Événement annulé ou reporté
Objet : {{evenement}} est {{annule_ou_reporte}}
> {{message_organisateur}}
> Nouvelle date : {{nouvelle_date}} (si report). Votre inscription est conservée ; si vous ne pouvez pas venir, annulez ici : {{lien_annulation}}.

### 10. Échéance de cotisation
Objet : Votre cotisation REC 242 : échéance le {{date_echeance}}
> Votre cotisation {{exercice}} de {{montant}} FCFA arrive à échéance le {{date_echeance}}. Vous pouvez la régler en une fois ou en deux tranches depuis votre espace : {{lien_cotisation}}.

### 11. Relance de cotisation
Objet : Relance {{numero_relance}}/3 : cotisation REC 242
> Bonjour {{prenom}},
> Sauf erreur de notre part, {{montant_du}} FCFA restent à régler sur votre cotisation {{exercice}} (date limite : {{date_limite}}).
> Régler maintenant : {{lien_cotisation}}, ou au siège contre reçu.
> Les statuts prévoient trois relances écrites ; après la troisième, le comité de direction peut constater la perte de la qualité de membre.
> Si vous avez déjà payé, répondez simplement à cet e-mail.

### 12. Reçu de paiement
Objet : Reçu {{numero_recu}} : {{objet_paiement}}
> Nous avons bien reçu {{montant}} FCFA ({{objet_paiement}}) par {{mode}}, le {{date}}. Votre reçu officiel est joint et disponible dans votre espace.

### 13. Constat de perte de la qualité
Objet : Votre adhésion à REC 242
> Bonjour {{prenom}},
> Malgré trois relances, votre cotisation {{exercice}} n'a pas été soldée. Le comité de direction a constaté, lors de sa réunion du {{date_comite}}, la perte de votre qualité de membre (article 14 des statuts). Il ne s'agit pas d'une sanction.
> Votre fiche est retirée de l'annuaire. Vous pouvez réadhérer après régularisation. Nous restons à votre écoute.

### 14. Demande à un expert
Objet : Un membre sollicite votre avis (#{{etiquette}})
> {{membre}} ({{entreprise}}) vous pose une question : « {{question}} ».
> Réponse souhaitée : {{preference}}. Répondre : {{lien}}. Réponse attendue sous 5 jours ouvrés.
Variante relance : « Cette demande attend votre réponse depuis 5 jours ouvrés. »

### 15. Mise en relation
Objet (reçue) : {{demandeur}} souhaite entrer en contact avec vous
> {{demandeur}}, {{entreprise_demandeur}} : « {{message}} ».
> Si vous acceptez, vous échangez dans votre espace membre. Aucune coordonnée n'est transmise.
> Accepter ou refuser : {{lien}}.
Objet (réponse) : {{membre}} a {{accepte_ou_refuse}} votre demande
> Acceptée : vous pouvez maintenant échanger dans votre espace membre. Refusée : aucun motif n'est donné.
Objet (nouveau message, 15 ter) : {{membre}} vous a écrit
> {{membre}} vous a envoyé un message dans votre espace membre.
> Lire et répondre : {{lien}}. Le contenu du message n'est pas recopié dans l'e-mail.

### 16. Réponse à une annonce
Objet : Nouvelle réponse à votre annonce « {{annonce}} »
> {{membre}} a répondu à votre annonce. Lire la réponse : {{lien}}.

### 17. Décision de modération
Objet : Votre annonce « {{annonce}} » : {{decision}}
> Publiée : visible par {{visibilite}} jusqu'au {{date_limite}}. Modification demandée : {{message}}. Refusée : {{motif}}.

### 18. Demande de modification traitée
Objet : Votre demande de modification ({{champ}})
> Validée : {{champ}} est maintenant « {{nouvelle_valeur}} ». Refusée : {{motif}}.

### 19. Procédure disciplinaire
Deux courriers, à faire valider par le comité avant la mise en production :
- Notification des griefs : griefs, faits, sanction envisagée, délai de 15 jours pour une défense écrite, possibilité d'être assisté par un membre.
- Décision : sanction prononcée, motivation, date d'effet, droit de recours devant l'assemblée générale sous 30 jours.
Ces courriers sont aussi générés en PDF pour une remise en main propre.

### 20. Réinitialisation du mot de passe
Objet : Réinitialisez votre mot de passe REC 242
> Lien valable 1 heure : {{lien}}. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.

### 21. Connexion depuis un nouvel appareil
Objet : Nouvelle connexion à l'administration de REC 242
> Connexion le {{date}} depuis {{appareil}}, {{ville}}. Si ce n'est pas vous, changez votre mot de passe et prévenez le super administrateur.

### 22. Invitation à l'administration
Objet : Vous êtes invité(e) à l'administration du site REC 242
> {{invitant}} vous a donné le rôle {{role}}. Créez votre mot de passe (12 caractères minimum, lien valable 72 heures) : {{lien}}.

## Tâches programmées (jobs Payload)

| Tâche | Fréquence | Effet |
|---|---|---|
| Expiration des opportunités | Chaque jour à 0 h 05 | Statut « Expirée » pour les dates limites dépassées |
| Rappel la veille | Chaque jour à 10 h | Modèle 8 |
| Échéances de cotisation | Chaque jour à 8 h | Modèle 10 ; passage « En relance » des échéances dépassées (sans envoi automatique des relances : c'est le trésorier qui les déclenche) |
| Experts sans réponse | Chaque jour ouvré à 8 h | Statut « Sans réponse » à 5 jours ouvrés, relance automatique (modèle 14) et pastille au back-office |
| Liens d'activation | Chaque heure | Expiration des jetons |
| Fin de suspension | Chaque jour | Retour à « Actif » à la fin de la durée prononcée |
| Validité des cartes | Chaque jour | Mise à jour de la date de validité au renouvellement |

Heure de référence : Brazzaville (`Africa/Brazzaville`, UTC+1).
