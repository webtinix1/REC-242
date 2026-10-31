# Écrans du site public

28 écrans. Pour chacun : la maquette (`maquette/site/?page=…`), les captures (`captures/site/NN-page-ordinateur.webp` et `-mobile.webp`), la route, l'objectif, les données, les règles et ce qui doit être vrai pour considérer l'écran terminé.

Les contrôles marqués « Démo : » dans la maquette servent à montrer un état (doublon, événement complet, vue membre connecté). Ils ne sont pas à reproduire : l'état correspondant doit apparaître naturellement.

## Éléments communs

- **En-tête** : logo, menu (Le réseau, Adhérer, Membres, Agenda, Opportunités, Actualités, Contact), bouton « Espace membre », bouton « Adhérer ». Le menu vient du global `navigation` (sept entrées au maximum). Sur mobile : menu plein écran. Sous-menu « Le réseau » : Qui sommes-nous, Gouvernance, Commissions, Antennes, Notre écosystème, Partenaires, Formalisation (repris en barre secondaire sur ces pages).
- **Pied de page** : devise, adresse, trois colonnes de liens (Le réseau, Participer, Nous joindre), liens légaux, plan du site, « Site réalisé par Webtinix », interrupteur « Activer les animations » (mémorisé sur l'appareil).
- **Messages de confirmation** (toasts) : bandeau bas d'écran après une action (envoi de formulaire, lien copié).
- **Données publiques uniquement** : aucune coordonnée de membre dans le HTML d'une page publique, même masquée en CSS.
- **Référencement** : titre, description, image de partage et URL canonique par page ; données structurées `Organization`, `Event`, `NewsArticle`, `BreadcrumbList`.

## Tableau des écrans

| N° | Écran (`?page=`) | Route | Source des données |
|---|---|---|---|
| 01 | accueil | `/` | pages (accueil), events, members mis en avant, opportunities publiques mises en avant, news, partners, faq, keyFigures |
| 02 | reseau | `/le-reseau` | pages, people, keyFigures, documents (statuts) |
| 03 | gouvernance | `/le-reseau/gouvernance` | people, expertiseTags, documents |
| 03 bis | profil d'un membre du comité | `/le-reseau/gouvernance/[slug]` | people |
| 04 | commissions | `/le-reseau/commissions` | commissions, people |
| 05 | antennes | `/le-reseau/antennes` | pages (blocs antennes), events |
| 06 | ecosysteme | `/le-reseau/ecosysteme` | pages |
| 07 | partenaires | `/le-reseau/partenaires` | partners (convention signée seulement) |
| 08 | partenariat | `/devenir-partenaire` | formulaire → contactMessages (formulaire partenariat) |
| 09 | adherer | `/adherer` | pages, settings (montants), testimonials, faq |
| 10 | candidature | `/adherer/candidature` | formulaire → applications, payments |
| 11 | merci | `/adherer/merci` | application créée, settings (chaîne WhatsApp) |
| 12 | membres | `/membres` | members et companies (consentement annuaire), directoryEdition |
| 13 | membre | `/membres/[slug]` | companies, members |
| 14 | agenda | `/agenda` | events |
| 15 | evenement | `/agenda/[slug]` | events, registrations |
| 16 | evenementpasse | `/agenda/[slug]` (statut terminé) | events, documents, news |
| 17 | opportunites | `/opportunites` | opportunities |
| 18 | formalisation | `/formalisation` | pages, events |
| 19 | actualites | `/actualites` | news |
| 20 | article | `/actualites/[slug]` | news |
| 21 | presse | `/presse` | documents (rubrique presse), news (communiqués), settings |
| 22 | contact | `/contact` | formulaire → contactMessages, settings |
| 23 | recherche | `/recherche?q=` | plugin search |
| 24 | plan | `/plan-du-site` | navigation, pages |
| 25 | mentions | `/mentions-legales` | pages |
| 26 | confidentialite | `/confidentialite` | pages |
| 27 | conditions | `/conditions-utilisation` | pages |
| 28 | erreur404 | toute route inconnue | `not-found.tsx` |

## Détail par écran

### 01 Accueil
Héros (titre, accroche, deux boutons, devise), carte « Prochain rendez-vous » (prochain événement publié : date, heure, places restantes, bouton d'inscription), chiffres clés, trois piliers, six raisons d'adhérer avec liens, trois prochains événements, « Le réseau en visages » (six membres mis en avant au plus, avec accord), bloc Formalisation, deux opportunités publiques mises en avant, trois dernières actualités, logos des partenaires, quatre questions de FAQ, bandeau final avec WhatsApp.
- Une section sans contenu disparaît (pas de bloc vide, pas de faux contenu).
- Un chiffre clé non renseigné est masqué.
- « Places restantes » = capacité moins inscrits ; « Complet, liste d'attente » quand il n'en reste plus.
- Fini quand : tout vient du back-office et la page passe le budget de performance de `02-architecture.md`.

### 02 Qui sommes-nous
Vision, histoire, but (article 7), trois piliers, cinq objectifs (article 8), quatre niveaux d'organisation, comité de direction (renvoi vers la gouvernance), valeurs, moyens d'action (article 9), chiffres clés, téléchargement des statuts.

### 03 Gouvernance
Fondatrice, comité de direction avec pôle et étiquettes d'expertise, section « Experts et référents par domaine » avec filtre par étiquette (« Tous » affiche les experts du réseau, une étiquette affiche comité et experts qui la portent, compteur de personnes), organigramme par pôle, quatre organes, textes (statuts, règlement, charte).
- Le bouton « Solliciter un expert » mène à la connexion de l'espace membre (écran Experts).
- Les cartes du comité, la fondatrice, l'organigramme, les personnes du comité dans le filtre et le bandeau du comité de la page « Le réseau » mènent au profil de la personne.

### 03 bis Profil d'un membre du comité
Portrait, surtitre, nom, fonction, pôle, lieu, étiquettes, puis chiffres clés, présentation, rubriques du parcours, compétences, domaines et outils. Une partie sans contenu ne s'affiche pas. Aucune coordonnée. Un expert, une adresse inconnue ou une fiche masquée renvoie la page 404. Une fiche sans présentation reste consultable, sans être proposée aux moteurs de recherche.

### 04 Commissions
Une carte par commission : objet, responsable, nombre d'experts rattachés, lien vers l'agenda filtré, bouton « Rejoindre la commission (membres) » qui mène à l'espace membre. Éthique et Vérification n'a pas ce bouton et porte la mention « sur désignation ».

### 05 Antennes
Carte schématique (SVG) des six implantations, puis une carte par antenne : statut (siège, antenne, en création, en projet), adresse ou modalité, référent (ou « À désigner »), lien vers ses événements, bouton de contact (formulaire de contact prérempli). Les antennes sont des blocs de la page, modifiables dans le back-office.

### 06 Notre écosystème
Schéma en cercle (REC 242 au centre, quatre familles d'acteurs autour), texte par famille, appel à devenir partenaire. Le texte porte « À valider » : aucune institution n'est nommée sans accord.

### 07 Partenaires
Grille de logos avec type et description ; chaque logo ouvre le site du partenaire dans un nouvel onglet. Trois façons de soutenir, bouton vers le formulaire. Seuls les partenaires « convention signée » apparaissent.

### 08 Devenir partenaire
Formulaire : organisation, nom et fonction, e-mail, téléphone, type de partenariat (cinq choix), proposition. Envoi → `contactMessages` (motif Partenariat, transmis à la commission Partenariats), e-mail d'accusé de réception, toast de confirmation. Limitation de débit et protection anti-robot invisible (champ piège, délai minimal).

### 09 Adhérer
Accroche, deux boutons (candidature en ligne, bulletin PDF), délai de réponse, six avantages, « Qui peut adhérer ? », tableau visiteur / membre, trois cartes de catégorie A, B, C avec montants, total de la première année et montant des deux tranches (calculés depuis les réglages), tableau des six statuts, parcours en cinq étapes, deux témoignages, FAQ.
- « Choisir A/B/C » ouvre la candidature avec la catégorie présélectionnée (`?categorie=A`).

### 10 Candidature
Formulaire en cinq étapes avec barre de progression, brouillon sur l'appareil. Contenu exact des champs : `03-modele-de-donnees.md` (`applications`). Règles : `05-regles-metier.md` §2.
- Étape 1 : contrôle de doublon côté serveur avant de passer à l'étape 2 ; message exact en cas de doublon, sans indiquer lequel des deux champs correspond.
- Étape 2 : secteurs (trois au maximum), description de l'activité obligatoire, services proposés.
- Étape 3 : ancienneté, objectifs, comment avez-vous connu REC 242, parrain, catégorie (six cartes ; Partenaire et Membre d'honneur indiquent « sur convention »).
- Étape 4 : récapitulatif des montants selon la catégorie, une fois ou deux tranches, paiement mobile (opérateur, numéro) ou au siège. Pour Partenaire et Membre d'honneur : message « montant fixé par convention », pas de paiement.
- Étape 5 : pièces jointes, autorisations de visibilité (cases séparées), consentement, acceptation des textes avec liens, récapitulatif modifiable par étape, bouton d'envoi.
- Erreurs affichées sous chaque champ, focus sur le premier champ en erreur, aucune perte de saisie.
- Fini quand : une candidature complète crée l'enregistrement, déclenche le paiement de test, envoie les deux e-mails et apparaît dans le back-office avec la pastille.

### 11 Merci
Statut « Reçue », numéro de dossier, rappel de l'e-mail envoyé, la suite en cinq étapes, bouton vers la chaîne WhatsApp, lien WhatsApp prérempli avec le numéro de dossier. Pas de lien vers le groupe des membres. Page accessible seulement juste après l'envoi (jeton de session), sinon redirection vers `/adherer`.

### 12 Annuaire
Recherche texte et filtres (secteur, ville, commission, taille), compteur, « Effacer les filtres », pagination. Les filtres sont dans l'URL. Carte : logo, nom, secteur, ville, catégorie, ancienneté, lien. Section « Être répertorié » : version web incluse et version papier (insertion standard, encarts, tarifs depuis `directoryEdition`, bouton de réservation vers le formulaire de contact pour un visiteur ou l'espace membre pour un membre). Encadré de confidentialité.
- Visiteur : pas de dirigeant, quartier, taille ni coordonnées. Le filtre « Taille » et « Commission » restent utilisables, la valeur n'est pas affichée.

### 13 Fiche membre
Statut, nom, secteur, ville, catégorie, ancienneté, présentation, services et recherches, informations. Visiteur : encadré « Dirigeant, quartier, taille et coordonnées réservés aux membres connectés » et bouton « Se connecter pour contacter ». Un membre connecté est redirigé vers la fiche de l'espace membre (`/espace-membre/annuaire/[slug]`).

### 14 Agenda
Onglets À venir et Passés, filtres ville et type, liste chronologique : date, type, accès (badge), titre, lieu, heure, places restantes ou « Complet, liste d'attente ». Un événement passé mène à l'écran 16.

### 15 Fiche événement
Type, accès, places, titre, image, date, lieu, accès, tarif (texte libre ; « À préciser » si vide), description, programme, intervenants, documents (ceux marqués « tous »), formulaire d'inscription (visiteur : nom, e-mail, WhatsApp, entreprise), partage (WhatsApp, Facebook, LinkedIn, X, copier le lien).
- Événement réservé aux membres : le formulaire est remplacé par la connexion. Sur invitation : message et contact.
- Complet : le bouton devient « Rejoindre la liste d'attente » (l'état « Démo » de la maquette).
- Fini quand : l'inscription crée la `registration`, envoie la confirmation avec .ics et billet QR, décrémente les places.

### 16 Événement passé
Date, type, « Terminé », titre, image, compte rendu, participants (seulement si renseigné), documents, lien vers l'actualité liée, galerie si présente.

### 17 Opportunités
Filtres par type, cartes : type, visibilité, titre, secteur et auteur, date limite, bouton « Répondre » (ouvre le lien de la source ou le « comment répondre »). Une opportunité réservée aux membres montre seulement son type et sa date limite, avec « Se connecter ». Section « Expirées » (dernières, grisées). Appel à publier (mène à l'espace membre).

### 18 Formalisation
Pour qui (trois cas), ce que le réseau propose (trois offres), prochain atelier (prochain événement de la commission Formalisation), bouton « En parler avec la commission » (contact prérempli), « Adhérer en catégorie A ». Mention « À valider » à conserver tant que la commission n'a pas fixé le détail.

### 19 Actualités
Article à la une, filtres type et secteur, grille, pagination, lien vers l'espace presse. Une actualité réservée aux membres montre son titre et son chapeau avec « Se connecter à l'espace membre pour lire ». Dans la maquette, chaque actualité apparaît deux fois (version publique et version réservée) pour montrer les deux états : en production, une seule carte par actualité.

### 20 Article
Type, date, auteur, titre, image, corps, intertitres, événement lié, « À lire aussi », partage. Données structurées `NewsArticle`.

### 21 Presse
Communiqués par année (PDF), kit média (logo, photos, fiche institutionnelle, biographies), dernières interventions (vide pour l'instant, message), contact presse (Yohan Dinga, formulaire de contact avec motif Presse).

### 22 Contact
Bloc WhatsApp (lien `wa.me` prérempli), formulaire avec motif en pastilles (Adhésion, Partenariat, Presse, Événement, Autre ; le texte sous le formulaire indique à qui le message est transmis), e-mail, siège et horaires, lien partenariat, plan d'accès (schéma SVG, indications en taxi, stationnement, « Ouvrir l'itinéraire » vers une carte avec les coordonnées GPS des paramètres, « Partager la position sur WhatsApp »). Envoi → `contactMessages`, routage selon `05-regles-metier.md` §11.

### 23 Recherche
Champ, compteur de résultats, filtres par type (page, événement, actualité, membre), résultats avec type, titre, extrait et lien. Ne remonte que du contenu public.

### 24 Plan du site
Toutes les pages groupées comme le menu, généré depuis la navigation et les pages publiées. Un `sitemap.xml` est généré en parallèle.

### 25, 26, 27 Mentions légales, confidentialité, conditions d'utilisation
Pages de texte éditables, avec bandeau « À valider » tant que le comité ne les a pas relues. L'hébergeur et la durée de conservation sont à compléter.

### 28 Erreur 404
Message, champ de recherche, liens utiles. Statut HTTP 404.
