/**
 * Textes par défaut des e-mails automatiques (docs/09-emails-et-notifications.md).
 * Ils sont modifiables dans le back-office (global « emailTemplates ») ; ces valeurs servent quand le modèle n'a pas été personnalisé.
 *
 * Syntaxe du corps :
 * - un paragraphe par bloc séparé par une ligne vide ;
 * - {{variable}} est remplacé à l'envoi ;
 * - une ligne « [bouton] Libellé | {{lien}} » devient le bouton principal ;
 * - une ligne entre crochets [si variable] … [fin] n'est gardée que si la variable est renseignée.
 */

export type TemplateKey =
  | 'candidatureConfirmation'
  | 'candidatureAlerte'
  | 'candidatureComplement'
  | 'bienvenueActivation'
  | 'refusMotive'
  | 'inscriptionConfirmation'
  | 'inscriptionListeAttente'
  | 'placeLiberee'
  | 'rappelVeille'
  | 'evenementAnnuleReporte'
  | 'echeanceCotisation'
  | 'relanceCotisation'
  | 'recuPaiement'
  | 'constatPerte'
  | 'demandeExpert'
  | 'relanceExpert'
  | 'miseEnRelationRecue'
  | 'miseEnRelationReponse'
  | 'reponseAnnonce'
  | 'decisionModeration'
  | 'demandeModificationTraitee'
  | 'disciplineGriefs'
  | 'disciplineDecision'
  | 'reinitialisationMotDePasse'
  | 'nouvelAppareil'
  | 'invitationAdmin'
  | 'accuseReceptionFormulaire'
  | 'nouveauDocument'
  | 'opportuniteSecteur'
  | 'lienConnexion'

export type TemplateDef = {
  label: string
  objet: string
  corps: string
  /** Variables disponibles, affichées dans le back-office. */
  variables: string[]
}

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  candidatureConfirmation: {
    label: '1. Confirmation de candidature',
    objet: 'Votre candidature à REC 242 est bien reçue ({{numero_dossier}})',
    corps: `Bonjour {{prenom}},

Nous avons bien reçu votre candidature pour {{entreprise}}, en catégorie {{categorie}}. Votre numéro de dossier : {{numero_dossier}}.

La suite : l'équipe vous contacte sur WhatsApp pour fixer un rendez-vous avec le comité de direction. Pensez à apporter votre pièce d'identité ; vous signerez la charte de l'adhérent sur place.

Paiement : {{situation_paiement}}.

Délai habituel de réponse : 10 jours ouvrés.

Une question ? Répondez à cet e-mail ou écrivez-nous sur WhatsApp au {{whatsapp}} en rappelant votre numéro de dossier.

[bouton] Suivre la chaîne WhatsApp de REC 242 | {{lien_chaine}}`,
    variables: [
      'prenom',
      'entreprise',
      'categorie',
      'numero_dossier',
      'situation_paiement',
      'whatsapp',
      'lien_chaine',
    ],
  },
  candidatureAlerte: {
    label: '2. Alerte nouvelle candidature (équipe)',
    objet: 'Nouvelle candidature {{numero_dossier}} : {{entreprise}} ({{categorie}})',
    corps: `{{prenom}} {{nom}}, {{entreprise}}, {{secteurs}}, {{ville}}. Paiement : {{situation_paiement}}.

[bouton] Ouvrir le dossier | {{lien_back_office}}`,
    variables: [
      'numero_dossier',
      'prenom',
      'nom',
      'entreprise',
      'categorie',
      'secteurs',
      'ville',
      'situation_paiement',
      'lien_back_office',
    ],
  },
  candidatureComplement: {
    label: '3. Complément demandé',
    objet: 'Votre dossier {{numero_dossier}} : un complément est nécessaire',
    corps: `Bonjour {{prenom}},

Pour poursuivre l'examen de votre dossier, nous avons besoin de : {{complement}}.

Vous pouvez répondre à cet e-mail avec le document, ou nous l'apporter au siège.`,
    variables: ['prenom', 'numero_dossier', 'complement'],
  },
  bienvenueActivation: {
    label: '4. Bienvenue et activation',
    objet: 'Bienvenue dans REC 242, activez votre espace membre',
    corps: `Bonjour {{prenom}},

Le comité de direction a validé votre adhésion. Bienvenue dans le réseau.

Votre numéro d'adhérent : {{numero_adherent}}.

Créez votre mot de passe pour accéder à votre espace (lien valable 72 heures).

[bouton] Créer mon mot de passe | {{lien_activation}}

Dans votre espace : votre carte de membre avec QR code, votre fiche dans l'annuaire, les opportunités réservées, votre cotisation et vos reçus.

Rejoignez le groupe WhatsApp des membres : {{lien_groupe}}. Ce lien est réservé aux membres, merci de ne pas le partager.`,
    variables: ['prenom', 'numero_adherent', 'lien_activation', 'lien_groupe'],
  },
  refusMotive: {
    label: '5. Refus motivé',
    objet: 'Votre candidature à REC 242',
    corps: `Bonjour {{prenom}},

Le comité de direction a examiné votre candidature et ne peut pas y donner une suite favorable pour le moment. Motif : {{motif}}.

{{texte_remboursement}}

Vous pouvez nous écrire pour en parler ou déposer une nouvelle candidature plus tard.`,
    variables: ['prenom', 'motif', 'texte_remboursement'],
  },
  inscriptionConfirmation: {
    label: '6. Confirmation d’inscription',
    objet: 'Inscription confirmée : {{evenement}}, le {{date}}',
    corps: `Vous êtes inscrit(e) à {{evenement}}, le {{date}} à {{heure}}, {{lieu}}.

Votre billet porte le numéro {{numero_billet}}. Présentez le QR code à l'entrée.

[bouton] Voir mon billet | {{lien_billet}}

Le fichier joint ajoute le rendez-vous à votre agenda.

Vous ne pouvez plus venir ? Annulez pour libérer votre place : {{lien_annulation}}`,
    variables: [
      'evenement',
      'date',
      'heure',
      'lieu',
      'numero_billet',
      'lien_billet',
      'lien_annulation',
    ],
  },
  inscriptionListeAttente: {
    label: '6 bis. Inscription en liste d’attente',
    objet: 'Liste d’attente : {{evenement}}, le {{date}}',
    corps: `L'événement {{evenement}} est complet. Vous êtes en position {{position}} sur la liste d'attente.

Nous vous écrivons dès qu'une place se libère.

Vous ne souhaitez plus attendre ? {{lien_annulation}}`,
    variables: ['evenement', 'date', 'position', 'lien_annulation'],
  },
  placeLiberee: {
    label: '7. Place libérée',
    objet: 'Une place s’est libérée pour {{evenement}}',
    corps: `Bonne nouvelle : une place s'est libérée et elle est à vous.

[bouton] Voir mon billet | {{lien_billet}}`,
    variables: ['evenement', 'lien_billet'],
  },
  rappelVeille: {
    label: '8. Rappel la veille',
    objet: 'C’est demain : {{evenement}}',
    corps: `Rendez-vous demain à {{heure}}, {{lieu}}. {{indications_acces}}

[bouton] Voir mon billet | {{lien_billet}}`,
    variables: ['evenement', 'heure', 'lieu', 'indications_acces', 'lien_billet'],
  },
  evenementAnnuleReporte: {
    label: '9. Événement annulé ou reporté',
    objet: '{{evenement}} est {{annule_ou_reporte}}',
    corps: `{{message_organisateur}}

[si nouvelle_date] Nouvelle date : {{nouvelle_date}}. Votre inscription est conservée ; si vous ne pouvez pas venir, annulez ici : {{lien_annulation}} [fin]`,
    variables: [
      'evenement',
      'annule_ou_reporte',
      'message_organisateur',
      'nouvelle_date',
      'lien_annulation',
    ],
  },
  echeanceCotisation: {
    label: '10. Échéance de cotisation',
    objet: 'Votre cotisation REC 242 : échéance le {{date_echeance}}',
    corps: `Votre cotisation {{exercice}} de {{montant}} FCFA arrive à échéance le {{date_echeance}}. Vous pouvez la régler en une fois ou en deux tranches depuis votre espace.

[bouton] Régler ma cotisation | {{lien_cotisation}}`,
    variables: ['exercice', 'montant', 'date_echeance', 'lien_cotisation'],
  },
  relanceCotisation: {
    label: '11. Relance de cotisation',
    objet: 'Relance {{numero_relance}}/3 : cotisation REC 242',
    corps: `Bonjour {{prenom}},

Sauf erreur de notre part, {{montant_du}} FCFA restent à régler sur votre cotisation {{exercice}} (date limite : {{date_limite}}).

[bouton] Régler maintenant | {{lien_cotisation}}

Vous pouvez aussi régler au siège contre reçu.

Les statuts prévoient trois relances écrites ; après la troisième, le comité de direction peut constater la perte de la qualité de membre.

Si vous avez déjà payé, répondez simplement à cet e-mail.`,
    variables: [
      'prenom',
      'numero_relance',
      'montant_du',
      'exercice',
      'date_limite',
      'lien_cotisation',
    ],
  },
  recuPaiement: {
    label: '12. Reçu de paiement',
    objet: 'Reçu {{numero_recu}} : {{objet_paiement}}',
    corps: `Nous avons bien reçu {{montant}} FCFA ({{objet_paiement}}) par {{mode}}, le {{date}}.

Votre reçu officiel est joint et disponible dans votre espace.`,
    variables: ['numero_recu', 'objet_paiement', 'montant', 'mode', 'date'],
  },
  constatPerte: {
    label: '13. Constat de perte de la qualité',
    objet: 'Votre adhésion à REC 242',
    corps: `Bonjour {{prenom}},

Malgré trois relances, votre cotisation {{exercice}} n'a pas été soldée. Le comité de direction a constaté, lors de sa réunion du {{date_comite}}, la perte de votre qualité de membre (article 14 des statuts). Il ne s'agit pas d'une sanction.

Votre fiche est retirée de l'annuaire. Vous pouvez réadhérer après régularisation. Nous restons à votre écoute.`,
    variables: ['prenom', 'exercice', 'date_comite'],
  },
  demandeExpert: {
    label: '14. Demande à un expert',
    objet: 'Un membre sollicite votre avis (#{{etiquette}})',
    corps: `{{membre}} ({{entreprise}}) vous pose une question : « {{question}} ».

Réponse souhaitée : {{preference}}. Réponse attendue sous 5 jours ouvrés.

[bouton] Répondre | {{lien}}`,
    variables: ['membre', 'entreprise', 'etiquette', 'question', 'preference', 'lien'],
  },
  relanceExpert: {
    label: '14 bis. Relance à un expert',
    objet: 'Rappel : un membre attend votre avis (#{{etiquette}})',
    corps: `Cette demande attend votre réponse depuis 5 jours ouvrés : « {{question}} ».

[bouton] Répondre | {{lien}}`,
    variables: ['etiquette', 'question', 'lien'],
  },
  miseEnRelationRecue: {
    label: '15. Mise en relation reçue',
    objet: '{{demandeur}} souhaite entrer en contact avec vous',
    corps: `{{demandeur}}, {{entreprise_demandeur}} : « {{message}} ».

Vos coordonnées ne sont transmises que si vous acceptez.

[bouton] Accepter ou refuser | {{lien}}`,
    variables: ['demandeur', 'entreprise_demandeur', 'message', 'lien'],
  },
  miseEnRelationReponse: {
    label: '15 bis. Réponse à une mise en relation',
    objet: '{{membre}} a {{accepte_ou_refuse}} votre demande',
    corps: `{{texte_reponse}}

[bouton] Ouvrir mes échanges | {{lien}}`,
    variables: ['membre', 'accepte_ou_refuse', 'texte_reponse', 'lien'],
  },
  reponseAnnonce: {
    label: '16. Réponse à une annonce',
    objet: 'Nouvelle réponse à votre annonce « {{annonce}} »',
    corps: `{{membre}} a répondu à votre annonce.

[bouton] Lire la réponse | {{lien}}`,
    variables: ['annonce', 'membre', 'lien'],
  },
  decisionModeration: {
    label: '17. Décision de modération',
    objet: 'Votre annonce « {{annonce}} » : {{decision}}',
    corps: `{{texte_decision}}

[bouton] Voir mes publications | {{lien}}`,
    variables: ['annonce', 'decision', 'texte_decision', 'lien'],
  },
  demandeModificationTraitee: {
    label: '18. Demande de modification traitée',
    objet: 'Votre demande de modification ({{champ}})',
    corps: `{{texte_decision}}`,
    variables: ['champ', 'texte_decision'],
  },
  // Courriers disciplinaires : textes à faire valider par le comité de direction avant la mise en production.
  disciplineGriefs: {
    label: '19. Procédure disciplinaire : notification des griefs',
    objet: 'Notification de griefs (dossier {{numero}})',
    corps: `Bonjour {{prenom}},

Le comité de direction vous notifie les griefs suivants : {{griefs}}.

Faits : {{faits}}

Sanction envisagée : {{sanction_envisagee}}.

Vous disposez de 15 jours, jusqu'au {{date_limite_defense}}, pour présenter votre défense par écrit. Vous pouvez être assisté(e) par un membre du réseau.`,
    variables: ['prenom', 'numero', 'griefs', 'faits', 'sanction_envisagee', 'date_limite_defense'],
  },
  disciplineDecision: {
    label: '19 bis. Procédure disciplinaire : décision',
    objet: 'Décision du comité de direction (dossier {{numero}})',
    corps: `Bonjour {{prenom}},

Après examen de votre défense et avis de la commission Éthique et Vérification, le comité de direction a prononcé : {{sanction}}, à compter du {{date_effet}}.

Motivation : {{motivation}}

Vous pouvez former un recours devant l'assemblée générale dans un délai de 30 jours, jusqu'au {{date_limite_recours}}.`,
    variables: ['prenom', 'numero', 'sanction', 'date_effet', 'motivation', 'date_limite_recours'],
  },
  reinitialisationMotDePasse: {
    label: '20. Réinitialisation du mot de passe',
    objet: 'Réinitialisez votre mot de passe REC 242',
    corps: `Vous avez demandé à réinitialiser votre mot de passe. Le lien est valable 1 heure.

[bouton] Choisir un nouveau mot de passe | {{lien}}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    variables: ['lien'],
  },
  nouvelAppareil: {
    label: '21. Connexion depuis un nouvel appareil',
    objet: 'Nouvelle connexion à l’administration de REC 242',
    corps: `Bonjour {{prenom}},

Une connexion à votre compte d'administration a eu lieu le {{date}} depuis {{appareil}}{{lieu}}.

Si ce n'est pas vous, changez votre mot de passe et prévenez le super administrateur.`,
    variables: ['prenom', 'date', 'appareil', 'lieu'],
  },
  invitationAdmin: {
    label: '22. Invitation à l’administration',
    objet: 'Vous êtes invité(e) à l’administration du site REC 242',
    corps: `Bonjour {{prenom}},

{{invitant}} vous a donné le rôle {{role}} sur le back-office de REC 242.

Créez votre mot de passe (12 caractères minimum). Le lien est valable 72 heures.

[bouton] Créer mon mot de passe | {{lien}}`,
    variables: ['prenom', 'invitant', 'role', 'lien'],
  },
  accuseReceptionFormulaire: {
    label: '23. Accusé de réception d’un formulaire',
    objet: 'Nous avons bien reçu votre message',
    corps: `Bonjour {{prenom}},

Votre message a bien été reçu et transmis à {{destinataire}}. Nous vous répondons dans les meilleurs délais.

Pour une réponse plus rapide, écrivez-nous sur WhatsApp au {{whatsapp}}.`,
    variables: ['prenom', 'destinataire', 'whatsapp'],
  },
  nouveauDocument: {
    label: '24. Nouveau document',
    objet: 'Nouveau document dans votre espace : {{titre}}',
    corps: `Un nouveau document est disponible dans votre espace membre : {{titre}}.

[bouton] Voir les documents | {{lien}}`,
    variables: ['titre', 'lien'],
  },
  opportuniteSecteur: {
    label: '25. Opportunité de vos secteurs',
    objet: 'Nouvelle opportunité : {{titre}}',
    corps: `{{type}} · {{secteurs}} · date limite le {{date_limite}}.

[bouton] Voir l'opportunité | {{lien}}`,
    variables: ['titre', 'type', 'secteurs', 'date_limite', 'lien'],
  },
  lienConnexion: {
    label: '26. Lien de connexion',
    objet: 'Votre lien de connexion à l’espace membre',
    corps: `Cliquez sur le bouton pour vous connecter. Le lien est valable 15 minutes et ne sert qu'une fois.

[bouton] Me connecter | {{lien}}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    variables: ['lien'],
  },
}

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[]
