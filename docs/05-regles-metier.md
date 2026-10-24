# Règles métier

Ces règles viennent des statuts, du règlement intérieur, du cahier des charges du client et de ses réponses (`sources/`). Elles s'appliquent côté serveur.

## 1. Catégories et montants

| Catégorie | Pour qui | Droit d'adhésion (une fois) | Cotisation annuelle |
|---|---|---|---|
| A | Individuel, informel, porteur de projet | 10 000 FCFA | 25 000 FCFA |
| B | Établissement, commerçant formalisé | 15 000 FCFA | 75 000 FCFA |
| C | Entreprise, société | 25 000 FCFA | 150 000 FCFA |
| Expert | Professionnel qui apporte son expertise ; rattaché à la catégorie B par les statuts | 15 000 FCFA | 75 000 FCFA |
| Partenaire | Organisation liée par une convention | fixé par convention | fixé par convention |
| Membre d'honneur | Personnalité admise par le comité de direction | fixé par convention | fixé par convention |

Attention : les statuts corrigés (article 11) indiquent 50 000 FCFA pour la cotisation B, les réponses de REC 242 et la maquette 75 000 FCFA. La maquette suit les réponses de REC 242. Les montants sont stockés dans un réglage administrable, pas dans le code, et l'écart est à faire confirmer (voir `11-a-obtenir-de-rec242.md`).

Partenaires, membres d'honneur : voix consultative à l'assemblée, pas de paiement en ligne. Leur candidature passe à l'étape « Paiement » avec un message, puis le comité prépare la convention.

## 2. Candidature

- Formulaire en 5 étapes : Vous, Votre entreprise, Votre projet, Paiement, Validation. Brouillon enregistré sur l'appareil (stockage local) à chaque étape.
- Obligatoire : nom, prénom, téléphone (format international, +242 par défaut), e-mail valide, tranche d'âge, raison sociale ou nom du projet, localisation, description de l'activité, 1 à 3 secteurs, ancienneté, au moins un objectif, catégorie, consentement au traitement des données, acceptation des statuts, du règlement et de la charte.
- Secteurs : **3 au maximum**. Le quatrième est refusé avec le message « Trois secteurs au maximum. Retirez-en un pour en choisir un autre. »
- **Anti-doublon** : avant d'enregistrer l'étape 1, le serveur compare l'e-mail (en minuscules, espaces retirés) et le téléphone (converti au format international) à toutes les candidatures et à tous les membres, validés ou en attente. S'il trouve une correspondance, il bloque et affiche exactement : « Une demande d'adhésion est déjà enregistrée avec ces coordonnées. Veuillez contacter l'administration si vous pensez qu'il s'agit d'une erreur. » Contrôle limité à 10 essais par heure et par appareil.
- Paiement à la candidature : en une fois (droit + cotisation) ou en deux tranches (droit + moitié de la cotisation, puis l'autre moitié sous 3 mois). Mode : paiement mobile (MTN MoMo, Airtel Money) ou au siège lors du rendez-vous.
- À l'envoi : numéro de dossier (REC-C-AAAA-NNNN côté candidat, C-NNNN dans le back-office), statut « Reçue », e-mail récapitulatif au candidat, e-mail d'alerte à l'adresse des paramètres (Rec242.Contact@gmail.com) et pastille rouge dans le back-office. Page de remerciement avec la chaîne WhatsApp.
- Une candidature papier saisie dans le back-office suit les mêmes contrôles.

## 3. Traitement d'une candidature

Statuts : Reçue → En examen (attribuée à un responsable) → Complément demandé (e-mail au candidat) → Acceptée → Active. Sorties : Refusée (motif obligatoire, e-mail courtois) et Archivée. Chaque changement est horodaté, attribué à un utilisateur et inscrit au journal.

Avant l'acceptation : rendez-vous avec le comité de direction, pièce d'identité vérifiée en main propre, charte signée, avis éventuel de la commission Éthique et Vérification. L'adhésion n'est pas automatique : agrément du comité et paiement du droit d'adhésion.

« Convertir en membre » (statut Active) crée le compte `members`, la fiche `companies` (avec les autorisations de visibilité choisies), le numéro d'adhérent, la cotisation de l'exercice et envoie l'e-mail de bienvenue avec le lien d'activation (72 h, renvoyable). Le lien du groupe WhatsApp des membres est dans cet e-mail et dans l'espace membre.

Refus après paiement : la règle de remboursement est à fixer par REC 242 ; en attendant, le paiement passe au statut « remboursement à traiter » et le trésorier est prévenu.

## 4. Cotisation, relances et perte de la qualité de membre

- L'exercice court de la date d'adhésion à la veille de la date anniversaire. La carte de membre est valable jusqu'à cette veille.
- La cotisation est soldée dans les **3 mois** suivant le début de l'exercice, en une fois ou en **deux tranches au plus**.
- Sans paiement à l'échéance : **trois relances écrites** (e-mail et WhatsApp), espacées d'au moins **15 jours**. Après la troisième, le statut passe à « 3 relances sur 3 » et le back-office propose « Constater la perte ».
- Le constat de perte est une décision du comité, inscrite au procès-verbal. Ce n'est pas une sanction. Le membre est informé par écrit, passe au statut « ancien membre », sa fiche quitte l'annuaire. Il peut réadhérer après régularisation, avec un nouvel agrément.
- Renouvellement : rappel 30 et 7 jours avant la date anniversaire, paiement depuis l'espace membre.
- Tout paiement donne un reçu officiel numéroté, envoyé par e-mail et disponible dans l'espace membre. Aucun encaissement hors compte officiel.

## 5. Discipline (statuts, article 15)

Sanctions graduées : rappel à l'ordre verbal, avertissement écrit, suspension de 1 à 6 mois, exclusion. Aucune sanction sans :
1. notification écrite des griefs ;
2. délai de **15 jours** pour la défense écrite ;
3. avis de la commission Éthique et Vérification (consultatif) ;
4. décision motivée du comité, notifiée par écrit.

Recours devant l'assemblée générale sous **30 jours**. Le recours n'est pas suspensif, sauf pour l'exclusion qui ne prend effet qu'après le délai de recours ou la décision de l'assemblée ; en attendant, le membre est suspendu à titre conservatoire. Un membre suspendu perd l'accès aux services et à son espace ; sa cotisation reste due. Le membre reste actif pendant la procédure tant qu'aucune sanction n'est prononcée.

Fin d'adhésion (article 14) : démission écrite, décès, non-paiement après trois relances, exclusion. Une demande de suppression de compte faite par le membre vaut démission.

## 6. Fiche, annuaire et visibilité

- Publication dans l'annuaire seulement avec le consentement du membre, révocable à tout moment. Sans consentement, la fiche n'est visible que des administrateurs.
- Visiteur : nom de l'entreprise, logo, secteur, ville, catégorie, ancienneté. Membre connecté : en plus dirigeant, quartier, taille, commission, et les coordonnées que le membre a choisi d'afficher (téléphone, WhatsApp, e-mail). Les coordonnées ne figurent jamais dans le code des pages publiques.
- Mise en avant sur l'accueil : seulement si le membre l'accepte et que le comité le sélectionne.
- Champs modifiables par le membre et champs verrouillés : voir `04-roles-et-droits.md`. Une demande de modification affiche la valeur actuelle jusqu'à validation.
- Annuaire imprimé : une édition par an ; insertion standard incluse pour les membres à jour au 30 novembre qui ont accepté de figurer ; encarts payants optionnels (tarifs dans les réglages).

## 7. Événements

- Accès : ouvert à tous, réservé aux membres, sur invitation. Capacité fixe ; au-delà, liste d'attente automatique et promotion de la première personne en attente à chaque désistement (e-mail).
- Inscription : un clic pour un membre connecté ; nom, e-mail, téléphone, entreprise pour un visiteur. Confirmation par e-mail avec fichier calendrier (.ics), billet avec QR code et lien d'annulation. Rappel la veille.
- Pointage le jour J : case sur la liste ou scan du QR code (carte de membre ou billet). Fonctionne avec une connexion faible et se synchronise ensuite.
- Annulation ou report : les inscrits sont prévenus automatiquement.
- Après l'événement : compte rendu, galerie, nombre de participants (affiché seulement s'il est renseigné).

## 8. Opportunités

- Date limite obligatoire. L'annonce passe en « Expirée » le lendemain et disparaît des listes.
- Source officielle obligatoire pour un appel d'offres relayé. REC 242 relaie l'avis, il ne traite pas les offres.
- Annonce déposée par un membre : statut « À modérer ». Le modérateur publie, demande une modification (message au membre) ou refuse (motif obligatoire envoyé au membre). Vérifications : date limite, pas de coordonnées dans le texte, conformité à la charte.
- Les réponses à une annonce de membre arrivent dans « Mes échanges » de l'auteur. À la publication, option pour prévenir les membres des secteurs concernés.

## 9. Experts et mises en relation

- Chaque membre du comité et chaque expert porte des étiquettes d'expertise. Une question d'un membre sur une étiquette est proposée aux personnes qui la portent ; le membre choisit la personne.
- Réponse attendue sous **5 jours ouvrés**. Au-delà, la demande remonte en « Sans réponse » dans le back-office, qui peut relancer, réattribuer ou répondre au nom de REC 242.
- Mise en relation : le membre contacté accepte ou refuse. Les coordonnées ne sont transmises qu'en cas d'acceptation ; un refus est envoyé sans motif. Plus de 10 demandes par semaine suspend l'envoi jusqu'à vérification. Un membre peut signaler un abus.

## 10. Commissions

Les commissions sont consultatives. Un membre actif peut demander à rejoindre une commission ouverte ; le responsable accepte ou refuse. La commission Éthique et Vérification n'est pas ouverte aux candidatures : ses membres sont désignés par le comité.

## 11. Messages des formulaires

Routage par motif : Adhésion → responsable membres ; Partenariat → commission Partenariats ; Presse → communication ; Événement → responsable événements ; Autre → secrétariat. Réponse depuis le back-office par e-mail (contact@rec242.cg) ou WhatsApp (numéro officiel) ; le message passe à « Traité ». Notes internes jamais envoyées à l'expéditeur.

## 12. Documents

Visibilité : public, membres actifs, inscrits à un événement donné, comité de direction. Les documents réservés passent par une route qui vérifie les droits et compte les téléchargements. Une nouvelle version remplace l'ancienne, qui reste dans l'historique.

## 13. Chiffres clés

Jusqu'à quatre. Chacun est saisi ou calculé (membres actifs, entreprises représentées, secteurs représentés). Un chiffre vide n'apparaît pas ; jamais de valeur par défaut.

## 14. Sécurité des comptes

Voir `02-architecture.md`. En résumé : administrateurs 12 caractères minimum, membres 10 ; blocage 15 minutes après 5 essais ; déconnexion après 30 minutes d'inactivité (30 jours pour un membre qui coche « Rester connecté ») ; alerte e-mail à la connexion d'un administrateur depuis un nouvel appareil ; journal de toutes les connexions ; lien d'activation 72 h ; lien de réinitialisation 1 h.
