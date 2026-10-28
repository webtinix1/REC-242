# Avancement

Tenu à jour à la fin de chaque lot.

| Lot | Statut | Date | Remarques |
|---|---|---|---|
| 0 Socle | Fait | 25/10/2026 | Payload 3.92, Next 16.3, PostgreSQL 16, admin en français, styles et polices de la maquette, planche `/composants`, Vitest et Playwright, migration initiale, script de seed. |
| 1 Comptes, rôles, journal | Fait | 25/10/2026 | Rôles et matrice (`src/access/roles.ts`), règles de mot de passe, blocage, session de 30 min, alerte nouvel appareil, invitation (lien 72 h), journal non modifiable avec filtres et export CSV, menu groupé avec pastilles, connexion habillée, gabarit e-mail et 30 modèles modifiables. |
| 2 Référentiels et contenus | Fait | 25/10/2026 | Taxonomies, médiathèque WebP (3 tailles), gouvernance et experts, commissions, partenaires, FAQ, témoignages, documents protégés (route de téléchargement, compteur, versions), paramètres en onglets (dont tarifs et annuaire imprimé), menus, pages par blocs avec brouillons et versions, actualités (relecture, programmation, archivage, réservé aux membres), plugin SEO, tâche de publication programmée, données de démonstration. |
| 3 Site institutionnel | Fait | 25/10/2026 | Mise en page commune ; écrans 01 à 07, 18 à 21, 23 à 28 en gabarits dont les textes viennent des blocs des pages (seed `src/seed/pages.ts`) et les listes des collections ; filtre des experts ; actualités (à la une, filtres type et secteur dans l’adresse, pagination, actualité réservée) ; article (`NewsArticle`, partage, « À lire aussi ») ; presse (communiqués par année, kit média) ; recherche (`@payloadcms/plugin-search`, contenu public seulement) ; plan du site ; pages légales ; 404 ; aperçu des brouillons `/apercu` (mode brouillon Next réservé à l’équipe, aperçu en direct) ; `sitemap.xml`, `robots.txt`, métadonnées et URL canonique par page, `BreadcrumbList` ; revalidation du site à chaque modification d’un contenu. Tests : 3 d’intégration, 23 E2E. Lighthouse mobile : voir « Lot 3 : performance ». |
| 4 Formulaires et messages | Fait | 25/10/2026 | Formulaires Contact (22, motif en pastilles, préremplissage par l’adresse `?motif=&objet=`) et Devenir partenaire (08) en actions serveur : champ piège, jeton horodaté signé (refus avant 3 s ou après 24 h), 5 envois par heure et par appareil, erreurs sous les champs sans perte de saisie. Collection `contactMessages` : routage par motif, lecture limitée aux rôles destinataires (fonctions d’accès), coordonnées de l’expéditeur non modifiables, pas de création par l’API. Accusé de réception (modèle 23), alerte à l’équipe selon « Alertes aussi pour » (modèle 23 bis). Écran back-office 13 en vue personnalisée : filtres, export CSV, réponse par e-mail (depuis l’adresse d’envoi) ou WhatsApp (`wa.me`), réponses types (Paramètres), transmission, notes internes, rouvrir, journal. Tests : 3 d’intégration, 5 E2E. |
| 5 Adhésion | Fait | 25/10/2026 | Écran site 09 (montants, total de la première année et tranches calculés depuis Paramètres › Tarifs ; blocs « Comparatif » et « Statuts de membre ») ; écran 10 en cinq étapes (brouillon sur l’appareil, contrôles serveur à chaque étape, anti-doublon serveur avec le message exact et 10 essais par heure, trois secteurs au plus, pièces jointes PDF/JPG/PNG de 5 Mo) ; écran 11 accessible seulement juste après l’envoi (cookie signé de 30 min) avec suivi du paiement mobile. Collections `applications` (numéros C-NNNN / REC-C-AAAA-NNNN, règles dans les hooks), `payments` (reçus PAY-NNNN sans trou, attribués à la confirmation, montants figés, PDF généré à la demande), `pieces` (stockage privé), `counters`. MTN MoMo et Airtel Money (API Collection) avec mode simulation, route de rappel `/api/paiements/[operateur]` qui relit toujours le statut chez l’opérateur, tâche de vérification chaque minute. Écrans back-office 03 (filtres et compteurs, export, candidature papier avec paiement à la saisie pour le trésorier) et 04 (statut, refus motivé avec e-mail, complément, rendez-vous, notes, e-mails modèles modifiables avant envoi, historique). E-mails 1, 2, 3, 5 et 12 ; remboursement à traiter prévenu au trésorier. Tests : 6 d’intégration, 5 E2E. « Convertir en membre » : au lot 6. |
| 6 Membres et espace membre | Fait | 25/10/2026 | Collections `members` (authentification séparée de l’administration, blocage 15 min après 5 essais, champs vérifiés en lecture seule pour le membre, e-mail et mot de passe non modifiables par l’API), `companies` (visibilité choisie par le membre seul, masquage par l’administration, présentation en relecture), `modificationRequests` (valeur actuelle relue sur la fiche, validation qui applique la modification et prévient le membre, refus motivé), `networkMessages` (lecture préparée pour le lot 10). « Convertir en membre » : fiche entreprise avec les autorisations de la candidature, compte en attente, numéro REC-AAAA-NNNN sans trou, exercice et validité de la carte, montants copiés des Tarifs, paiements rattachés, e-mail 4 avec lien d’activation de 72 h (seule son empreinte est stockée). Espace membre `/espace-membre` : connexion et ses états (connexion, session expirée, mot de passe oublié, lien de connexion de 15 min, activation et lien expiré, en attente, suspendu), session de 30 min glissante (`src/proxy.ts`) ou 30 jours, retour à la page demandée ; tableau de bord (02), profil (03 : fiche libre, demandes de modification avec justificatif, visibilité, notifications, photo et logo recadrés en WebP, mot de passe, déconnexion des autres appareils, export JSON des données, demande de suppression), carte (13 : QR signé, agrandissement, PDF au format carte). Back-office : écran 05 (fiches avec recherche et filtre, demandes de modification et présentations à relire, import CSV avec aperçu et rapport d’erreurs, export CSV journalisé) et 06 (statut avec motif, visibilité et masquage, fiche et commissions, compte et renvoi du lien, cotisation, fin d’adhésion). Tests : 4 d’intégration (dont l’isolement des données entre membres), 2 E2E (parcours candidature → activation → connexion → carte). |
| 7 Annuaire | Fait | 25/10/2026 | Règles de visibilité côté serveur (`src/lib/annuaire/donnees.ts`) : une fiche n’apparaît que si le membre est actif, a consenti et n’est pas masquée ; deux formes de données distinctes, publique (sans coordonnées, dirigeant, quartier ni taille, jamais lues en base pour le public) et membre (coordonnées selon les choix de chacun, « Masqué par le membre » sinon). Site : écrans 12 (recherche et filtres secteur, ville, commission, taille dans l’adresse, compteur, pagination, « Être répertorié » avec les tarifs des Paramètres, confidentialité) et 13 (fiche visiteur ; un membre connecté est redirigé vers la fiche de l’espace membre) ; « Le réseau en visages » sur l’accueil (consentement du membre et sélection du bureau). Espace membre : écrans 07 et 08 (coordonnées choisies, demande de mise en relation, signalement). Collection `connectionRequests` : destinataire déduit de la fiche publiée, transitions contrôlées (seul le membre contacté accepte ou refuse, le demandeur annule), plafond de 10 demandes par semaine qui suspend l’envoi jusqu’à vérification (rétablissement depuis l’écran 06), e-mails 15 et 15 bis, coordonnées partagées après acceptation limitées aux choix de chacun (`src/lib/annuaire/relations.ts`). Annuaire imprimé : `directoryAds` (montant copié des Paramètres), panneau de l’écran 05 (fiches éligibles à jour à la clôture, encarts, réservation), export pour l’imprimeur (ZIP : CSV et logos, journalisé). Tests : 2 d’intégration, 3 E2E (aucune coordonnée dans le HTML public). |
| 8 Événements | Fait | 25/10/2026 | Collections `events` (accès tous, membres ou invitation, capacité, clôture, liste d’attente, programme, intervenants, documents par visibilité, compte rendu, galerie, actualité liée ; lien de carte ou de visio lisible par l’équipe seulement) et `registrations` (règles dans les hooks : inscription sérialisée par un verrou sur la ligne de l’événement, liste d’attente avec position, promotion automatique au désistement ou manuelle, statut « Complet » tenu à jour, doublons refusés, numéro de billet B-JJMM-NNN sans trou, visiteur seulement par l’action du site avec anti-robots). Billets et liens d’annulation par jetons signés, fichier .ics, e-mails 6, 6 bis, 7, 8 (tâche horaire « rappel la veille ») et 9 (annulation ou report). Site : écrans 14, 15, 16, billet et annulation par lien, agenda de l’accueil. Espace membre : écran 04 et « Mes prochains rendez-vous » du tableau de bord. Back-office : écrans 07 (cartes, duplication) et 08 (inscrits et présence, scanner par la caméra avec `BarcodeDetector` ou saisie, file hors connexion synchronisée au retour du réseau, liste d’attente et promotion, export CSV, annulation ou report avec message, actualité « Retour sur… »). Tests : 3 d’intégration (capacité 2 → liste d’attente → promotion ; pointage par carte et par billet), 2 E2E. |
| 9 Opportunités | Fait | 25/10/2026 | Collections `opportunities` (règles dans les hooks : une annonce de membre repart toujours « À modérer », le membre ne publie jamais lui-même ; date limite obligatoire et future ; source obligatoire pour un appel d’offres ; motif obligatoire pour refuser, message pour demander une modification ; mise en avant réservée au public ; coordonnées détectées automatiquement pour la modération), `opportunityReplies` (réponse aux offres entre membres, jamais à sa propre annonce, lue par l’auteur et le répondant seulement) et `fichiers` (pièces jointes privées, servies selon leur visibilité). E-mails 16, 17 et 25 (alerte aux membres des secteurs concernés qui gardent la préférence, une seule fois). Tâche horaire d’expiration : « Expirée » le lendemain de la date limite (heure de Brazzaville). Site : écran 17 (les opportunités réservées ne montrent que leur type et leur date limite, lues sans leurs autres champs ; section Expirées) et mise en avant sur l’accueil. Espace membre : écrans 05 et 06 (publication en trois étapes, Mes publications, Répondre) et « Opportunités pour vous » du tableau de bord. Back-office : écran 11 (tableau, panneau « À modérer » avec vérifications et actions) ; écran 20 par le formulaire natif. Tests : 2 d’intégration (modération avant visibilité, expiration le lendemain), 2 E2E. |
| 10 Experts, échanges, commissions | Fait | 25/10/2026 | Collections `expertRequests` (la personne sollicitée porte l’étiquette ; échéance à 5 jours ouvrés ; fil avec événements système ; le membre ne peut que clôturer) et `commissionRequests` (commissions « ouvertes » seulement, une demande en attente à la fois ; acceptation qui ajoute la commission à la fiche et prévient le membre par un message du réseau). Réponse de l’expert par un lien signé lié à la demande et à la personne (une réattribution invalide l’ancien lien), page publique `/experts/reponse/[jeton]`. Tâche horaire « Sans réponse » ; relance (e-mail 14 bis), réattribution (e-mail 14 à la nouvelle personne), réponse au nom de REC 242, clôture. « Mes échanges » : quatre sources, non-lus tenus par fil (`nonLuPar`, `nonLuMembre`, `luPar`), écriture seulement dans un fil ouvert (mise en relation acceptée, réponse à une annonce, demande à un expert non clôturée), coordonnées partagées après acceptation selon les choix du membre. Espace membre : écrans 09 et 10, pastille des non-lus, carte « Mes échanges » du tableau de bord, « Rejoindre une autre commission » dans Mon profil. Back-office : écrans 19 (demandes à accepter ou refuser, cartes des commissions) et 21 (questions aux experts avec actions ; mises en relation : suivi, signalements, membres suspendus pour dépassement du plafond). Tests : 2 d’intégration (suivi, relance, réattribution, clôture ; compteurs de non-lus), 2 E2E. |
| 11 Cotisations et discipline | Fait | 25/10/2026 | Collection `dues` (une échéance par membre et par exercice, montants figés à l’émission, tranches dont la première inclut le droit d’adhésion la première année, date limite à 3 mois ; tranches recalculées à chaque paiement confirmé, rattaché par le champ `echeance` du paiement ; statut à jour, à venir, en relance, perte). Relances : trois au plus, la suivante refusée avant 15 jours, jamais avant la date limite (e-mail 11) ; constat de perte après la troisième relance et 15 jours, avec procès-verbal (e-mail 13, ancien membre, fiche retirée de l’annuaire). Renouvellement : rappels 30 et 7 jours avant la date anniversaire (e-mail 10), nouvelle échéance au début de l’exercice (tâche quotidienne). Paiement mobile des tranches depuis l’espace membre, paiement manuel du trésorier, reçu numéroté envoyé au membre, export comptable. Collection `disciplinaryCases` (dossier D-AAAA-NNN) : étapes de l’article 15 dans l’ordre imposé par le serveur (griefs notifiés avec courrier PDF et e-mail 19, défense ou délai de 15 jours écoulé, avis de la commission, décision motivée avec courrier PDF et e-mail 19 bis, recours sous 30 jours, clôture) ; suspension de 1 à 6 mois appliquée tout de suite et levée automatiquement à son terme ; exclusion avec suspension conservatoire, effective à la fin du délai de recours ou après la décision de l’assemblée. Espace membre : écrans 11 et 12. Back-office : écran 12, section Discipline de l’écran 06, tableau de bord (écran 02) avec ses compteurs. Tests : 2 d’intégration (la deuxième relance pas avant 15 jours ; pas de sanction sans les étapes de l’article 15 ; un membre suspendu ne se connecte plus). |
| 12 Finitions et mise en production | En cours | 26/10/2026 | Alignement visuel du site et de l’espace membre fait (voir plus bas). |

## Écarts assumés avec la maquette

- Utilisateurs : le bouton natif « Créer » de Payload reste visible pour le super administrateur (création directe avec mot de passe), en plus de « Inviter un utilisateur ».
- Actualités de démonstration : toutes publiées, comme sur le site de la maquette (l'écran 09 de la maquette en montrait trois en brouillon, programmé et relecture pour illustrer les statuts).
- Journal : la ville n'est renseignée que si le frontal transmet un en-tête de géolocalisation (Nginx GeoIP, à configurer au lot 12) ; sinon la colonne reste vide. On n'invente pas de ville.
- Commissions : la mention « sur désignation » d’Éthique et Vérification est portée par le bandeau photo en bas de page, comme dans la maquette, pas par la carte.
- Actualités : la maquette montrait chaque actualité deux fois (publique et réservée) ; ici une seule carte par actualité, et l’actualité « à la une » est choisie dans l’admin (case « À la une »), la plus récente à défaut.
- Recherche : la maquette n’a pas de titre de niveau 1 sur cet écran ; un titre « Rechercher sur le site » est ajouté, masqué visuellement.
- Pied de page : les titres de colonnes sont des `h2` (ordre des titres pour l’accessibilité) avec le style des `h4` de la maquette.
- Apostrophes : les textes sont saisis avec l’apostrophe typographique (’), la maquette mélange ’ et '.
- Pied de page mobile : l’interrupteur « Activer les animations » chevauchait le copyright, dans la maquette aussi ; corrigé (il passe sous le copyright).
- Messages : pas de photo pour l’expéditeur (initiales seulement) ; un visiteur n’a pas de photo dans nos données, la maquette illustrait avec des portraits.
- Messages : les réponses types ont les titres de la maquette ; leurs textes sont des propositions génériques à relire par REC 242 (Paramètres, onglet E-mails automatiques). La maquette ne montrait que des réponses déjà personnalisées.
- Contact : quand un seul champ obligatoire manque, l’encadré d’erreur dit « Un champ est à compléter » (la maquette ne montre que le cas « Deux champs sont à compléter »).
- Contact : « Une copie vous a été envoyée par e-mail » n’apparaît que si l’expéditeur a donné son e-mail (l’accusé de réception part à cette adresse).
- Candidature : la tranche d’âge part de « Choisir » (la maquette présélectionnait 18-25) pour ne pas enregistrer une réponse que le candidat n’a pas donnée. Les liens vers les statuts, le règlement et la charte sont sous la case d’acceptation (un lien ne peut pas être placé dans la case, qui est un bouton).
- Merci : une ligne indique l’état du paiement mobile (« validez la demande sur votre téléphone », puis « Paiement reçu : le reçu PAY-0001 vous a été envoyé par e-mail ») ; la maquette ne montrait pas cet état. La ligne « Recommencer la démonstration » n’est pas reprise (contrôle de démonstration).
- Back-office, candidatures : pas de photo du candidat (initiales), le formulaire ne demande pas de photo. Au-dessus de la vue, l’en-tête de document de Payload (titre et onglets Éditer, API) reste visible.
- Candidature papier : le champ « Reçu lors de » propose « Passage au siège » ou « Un événement » avec le nom à saisir ; la liste des événements arrivera avec le lot 8. Le paiement reçu à la saisie n’est proposé qu’au trésorier et aux administrateurs (droit « Cotisations et paiements »).
- Espace membre, rubriques des lots suivants : le menu (barre latérale, onglets mobiles, menu « Plus ») ne montre que les rubriques livrées (Accueil, Ma carte, Mon profil) ; les autres apparaissent avec leur lot. Sur le tableau de bord, les blocs rendez-vous, opportunités, échanges et experts, l’action « Payer » et le bouton « Voir ma cotisation » arrivent avec les lots 8 à 11. La carte « Groupe des membres » n’apparaît que si le lien du groupe est renseigné dans Paramètres › WhatsApp (vide dans les données de démonstration).
- Connexion, état « En attente » : le numéro de dossier n’est pas rappelé, car l’écran s’affiche après une tentative sans mot de passe valide (il ne doit rien révéler de plus que l’existence d’une candidature en cours). Le sélecteur « Démo : états de l’écran » n’est pas repris : chaque état découle des données (statut du compte, candidature en cours, lien expiré, session expirée).
- Profil, sécurité : après un changement de mot de passe, le message dit « Vos autres appareils devront se reconnecter. » sans « Un e-mail de confirmation vous a été envoyé » : aucun modèle d’e-mail n’est prévu pour ce cas (`docs/QUESTIONS.md`, question 3). « Dernière connexion » affiche la date et l’heure, sans ville (pas de géolocalisation, comme le journal).
- Profil, mes données : « Télécharger mes données » fournit tout de suite un fichier JSON (fiche, entreprise, demandes, paiements) au lieu d’un envoi par e-mail sous 48 heures ; les inscriptions et échanges s’y ajouteront avec leurs lots.
- Profil, commissions : « Rejoindre une autre commission » arrive avec les demandes de commission (lot 10) ; la carte liste les commissions du membre et leur prochaine réunion.
- Notifications : les canaux affichés disent « par e-mail », tant que l’API WhatsApp n’est pas branchée (la maquette annonçait aussi WhatsApp).
- Carte : la validité est la veille de la date anniversaire (règle de `05-regles-metier.md`). Le badge « Cotisation en retard » viendra avec les relances (lot 11).
- Back-office 05 : export CSV seulement (le CSV en UTF-8 avec « ; » s’ouvre dans Excel) ; un vrai fichier Excel pourra être ajouté au lot 12. L’annuaire imprimé est au lot 7. Une barre de recherche et un filtre de statut sont ajoutés au-dessus du tableau (demandés par `08-ecrans-back-office.md`).
- Back-office 06 : la discipline est au lot 11. « Enregistrer un décès » est ajouté à côté de « Enregistrer une démission » (prévu par `08-ecrans-back-office.md`). La fiche entreprise se modifie dans le formulaire natif (lien « Modifier ») ; les commissions depuis la fiche membre.
- Une seule session par navigateur : l’administration et l’espace membre partagent le cookie de session de Payload ; se connecter à l’un déconnecte de l’autre sur le même navigateur.
- Annuaire (site) : pas de sélecteur « Vue visiteur / Vue membre connecté » ; le site public montre toujours la vue visiteur et un membre connecté est envoyé vers l’annuaire de son espace (aucune coordonnée dans le code des pages publiques). Pas de photo d’illustration sous l’en-tête de la fiche ni de ligne « Commission » pour le visiteur (donnée réservée). Les pastilles listent tous les secteurs, villes et commissions des référentiels.
- Annuaire : 6 fiches par page, comme la maquette.
- Accueil, « Le réseau en visages » : portrait du dirigeant affiché seulement pour les fiches mises en avant (le membre l’a accepté) ; son nom n’est pas affiché au visiteur.
- Mise en relation : accepter ou refuser se fait dans « Mes échanges » (lot 10) ; le lien de l’e-mail 15 y mène. La règle et les contrôles sont déjà en place côté serveur. Le message de confirmation dit « par e-mail » (WhatsApp pas encore branché).
- Signalement d’une fiche : inscrit au journal (catégorie Validations) pour le responsable membres ; un écran dédié pourra venir avec les « Demandes des membres » (lot 10).
- Annuaire imprimé : réservation d’un encart par l’équipe (écran 05) ; « Réserver un encart » du site mène au formulaire de contact, pour le visiteur comme pour le membre (la maquette ne prévoit pas d’écran de réservation dans l’espace membre). Le paiement de l’encart s’enregistre comme un paiement (objet « Encart »), son rattachement automatique viendra avec l’écran Cotisations (lot 11). « Pages estimées » et « Générer le PDF d’impression » ne sont pas repris : la mise en page de l’annuaire imprimé revient à l’imprimeur à partir de l’export (à confirmer, `docs/QUESTIONS.md`, question 5).
- Événements : pas d’image dans les données de démonstration (la maquette illustrait par type avec des photos de scènes) ; les vignettes apparaissent dès qu’une image est choisie. Textes courts ajoutés pour des états que la maquette ne montre pas : « Les inscriptions sont closes. », accès « Réservé aux membres » ou « Sur invitation » avec « Contacter le secrétariat », « Nouvelle date : … », la page d’annulation par lien, « Accéder au lieu ou à la visioconférence » sur le billet, « Aucun rendez-vous passé », « Garder ma place ».
- Inscription : après une inscription de visiteur, pas de bouton « Annuler mon inscription » sur la page (l’annulation se fait par le lien de l’e-mail, qui identifie la personne) ; le texte de confirmation dit « par e-mail » sans WhatsApp.
- Rappel de la veille : envoyé par la tâche horaire aux inscrits des événements qui commencent dans 12 à 36 heures (une seule fois par inscription).
- Pointage : un QR de carte d’un membre non inscrit répond « Pas inscrit à cet événement » (pas d’inscription automatique à l’entrée). Le scanner utilise la détection de QR du navigateur (Chrome Android) ; sur les autres navigateurs, saisie du code ou lecteur externe. Export Excel : CSV seulement (s’ouvre dans Excel).
- Back-office 08 : l’en-tête de document de Payload (titre de l’événement, onglets Éditer et API) reste au-dessus de la vue, comme pour les candidatures et les fiches membres. Les champs complets de l’événement se modifient dans le formulaire natif (« Modifier la fiche »).
- Opportunités : pas de photo sur les cartes (la maquette les choisissait par titre ; la collection n’a pas de champ image). Écran 20 : formulaire natif de Payload (libellés « Sauvegarder », pas d’aperçu en direct de la carte ni d’encart « Règles ») ; les règles sont appliquées par le serveur et rappelées dans les descriptions des champs. Le libellé du type est « Appel d’offres » (la maquette écrit parfois « relayé »). Les opportunités de démonstration de la maquette n’ont pas de lien de source : « Consulter l’avis officiel » apparaît dès qu’un lien est saisi ; elles ont été passées à leur statut directement en base par le seed. « Me faire aider » mène à l’écran Experts (lot 10).
- Experts : la question part par e-mail à la personne sollicitée (champ « E-mail » ajouté à la fiche `people`, jamais affiché sur le site) ; sans adresse, l’équipe est avertie par le journal et transmet elle-même (`docs/QUESTIONS.md`, question 6). Le membre n’est pas prévenu par e-mail de la réponse (aucun modèle prévu) : il la voit dans « Mes échanges ». Jours ouvrés : du lundi au vendredi, sans les jours fériés. « Vous serez prévenu(e) » : le genre du membre n’est pas connu. La page de réponse de l’expert n’existe pas dans la maquette (textes courts ajoutés).
- Mes échanges : sur mobile, une seule colonne avec « ← Retour à la liste » ; tri par dernière activité ; la mention « prévenu par e-mail et WhatsApp » sous la zone de réponse n’est pas reprise (aucune notification n’est envoyée pour un message dans un fil). Messages du réseau : expéditeur « Secrétariat ».
- Back-office 21, mises en relation : tableau de suivi en lecture (pas de boîte à deux colonnes), avec les signalements et le rétablissement des membres suspendus pour dépassement du plafond.
- Données de démonstration des échanges écrites directement en base (auteurs suspendus, dates passées) ; la question à Grâce Nkounkou apparaît « Sans réponse » (échéance passée), la maquette montrait « Nouvelle réponse ».
- Cotisations (back-office 12) : un cinquième compteur « Perte à constater » apparaît quand il y en a ; « Envoyer les relances dues » envoie les relances une par une, chacune contrôlée par le serveur (15 jours, trois au plus) ; le paiement manuel propose espèces et virement (le paiement mobile passe par la plateforme) ; le numéro de reçu est attribué au paiement (affiché « attribué automatiquement »).
- Discipline (06) : griefs en cases à cocher (plusieurs griefs possibles) ; le dossier est créé avec la notification des griefs ; pièces du dossier : champ prévu dans la collection, sans écran de dépôt pour l’instant. Les courriers disciplinaires sont des textes à faire valider par le comité (`src/emails/defaults.ts`).
- Tableau de bord (02) : une seconde rangée de cartes (membres actifs, cotisations en relance, paiements du mois) et le panneau « Activité récente » complètent la maquette pour couvrir tous les compteurs ; chaque carte n’apparaît qu’aux rôles qui lisent la collection.
- Espace membre 11 : la jauge « % réglé » porte sur droit d’adhésion et cotisation ; « Au siège » est une information (le paiement est enregistré par le trésorier). 12 : la charte signée personnelle n’apparaît pas (aucun fichier rattaché au membre) ; les documents « Inscrits » sont ceux des événements auxquels le membre est inscrit (règle de lecture de `documents`).
- Renouvellement : la deuxième année et les suivantes, la cotisation prend le tarif en vigueur (Paramètres › Tarifs), sans droit d’adhésion.

## Notes techniques

- Lot 0 : le gabarit Payload livrait une configuration ESLint cassée (`@eslint/eslintrc` absent) ; remplacée par la configuration plate de `eslint-config-next`. `@playwright/test` aligné sur la version 1.63 des navigateurs installés.
- Lot 1 : les écritures faites pendant la connexion (dernière connexion, journal) passent par la transaction de la requête (`req`), sinon PostgreSQL se bloque sur la ligne de l'utilisateur. Les tests d'intégration tournent en environnement `node` (jsdom casse la signature des jetons). Payload replie son menu jusqu'à 1440 px : `NavLinks` le rouvre au-dessus de 1024 px pour coller à la maquette.
- Lot 2 : la publication programmée est une tâche Payload (`src/jobs/publierProgrammes.ts`, toutes les minutes) plutôt que la programmation native, pour garder le statut « Programmé » visible dans la liste. Les fichiers des documents sont dans `private/documents` (hors dossier public) ; une nouvelle version remplace le fichier, l'historique garde la trace (numéro, nom, date). Les PDF des statuts, du règlement, de la charte et du bulletin viennent de `sources/` ; les autres documents sont des PDF de démonstration à remplacer.
- E-mails en développement : Mailpit (`docker compose`) ou MailDev (`npx maildev --smtp 1025 --web 1080`) ; `tests/helpers/mailbox.ts` lit l'un ou l'autre.

## Modifications apportées aux documents

- `03-modele-de-donnees.md` : les globals `keyFigures`, `pricing` et `directoryEdition` sont des onglets du global `settings` (Chiffres clés, Tarifs), comme l'écran 15 de la maquette. Les réglages d'alerte sont dans l'onglet « E-mails automatiques » de `settings`, les textes des modèles dans le global `emailTemplates`.
- Secteurs : dix secteurs (liste de `03-modele-de-donnees.md`, avec Santé), alors que `seed/contenus.json` en listait neuf ; l'annuaire de la maquette filtre bien sur Santé.

- `09-emails-et-notifications.md` : le code ajoute des variantes « bis » (liste d'attente, relance d'un expert, réponse à une mise en relation, décision disciplinaire) pour que chaque envoi ait son propre modèle modifiable. Les numéros du document restent valables.

## Lot 3 : notes

- Principe : chaque page institutionnelle a un gabarit (`src/app/(site)/…/page.tsx`) qui reproduit le balisage de `maquette/sources/B-Site.dc.html`. Les textes viennent des blocs de la page (`getPage(chemin)` puis `block(page, 'ancre')`, champ « Section » des blocs), les listes des collections. Les liens « document:Titre » du seed sont résolus en adresse de téléchargement.
- Champs ajoutés : blocs « Section » et « Cartes » (boutons, note, mention « À valider »), documents (« Dans l’espace presse » : communiqué ou kit média), commissions (image de la carte), étiquettes d’expertise (« Proposée comme filtre sur la page Gouvernance »), actualités (signature, « À la une », « À lire aussi »). Migration `20261025_012157_lot3_site`.
- Sécurité : le corps, les blocs et le PDF d’une actualité réservée ont une fonction d’accès de champ (`reservedFieldRead`) : l’API ne les renvoie qu’à l’équipe et aux membres actifs. L’index de recherche ne contient que le titre et le chapeau d’une actualité réservée.
- Le site est prérendu : un hook (`src/hooks/revalidate.ts`) relance le rendu à chaque modification d’un contenu affiché (pages, actualités, documents, gouvernance, commissions, partenaires, FAQ, médias, taxonomies, paramètres, menus).
- L’en-tête `Critical-CH` ajouté par Payload est limité à `/admin` (`next.config.ts`) : sur le site il faisait recommencer la première requête (environ 0,7 s).
- La 404 passe par une route attrape-tout du site (`[...inconnu]`) qui appelle `notFound()`, pour garder l’en-tête et le pied du site (deux mises en page racines : site et admin).
- Développement : ne pas lancer `pnpm seed` ou `pnpm test:int` pendant que `pnpm dev` tourne (les deux synchronisent le schéma et se bloquent mutuellement). Vitest exécute les fichiers un par un.

## Lot 3 : performance

Lighthouse mobile sur l’accueil, compilation de production, sur le poste de développement Windows (Edge sans interface, limitation simulée) : accessibilité 100, bonnes pratiques 100, SEO 100, performance entre 80 et 85 selon les passages (LCP simulé 3,6 s, LCP réellement observé 0,6 s). L’écart vient du temps de calcul CPU modélisé (styles et animations de la maquette, scripts Next). Corrections déjà faites : images responsives (`srcset`), image du héros révélée dès le premier affichage, polices du premier écran préchargées, logo en WebP redimensionné, pas de préchargement automatique des liens de navigation, en-tête `Critical-CH` limité à l’admin. Le seuil de 90 n’est pas encore atteint de façon stable. Suite : voir « Lot 12 : performance, Lighthouse mobile ».

## Lot 5 : notes

- Paiement mobile : `PAIEMENT_MODE` (simulation par défaut en développement ; « test » pour les bacs à sable ; en production sans clés, le paiement mobile est indisponible et aucun identifiant de simulation n’est jamais validé). En simulation, le paiement est confirmé 5 secondes après la demande ; un numéro payeur qui se termine par 0 simule un refus. Variables dans `.env.example`.
- Le rappel d’un opérateur ne fait jamais foi : le statut est relu par l’API de l’opérateur (MTN : `GET /collection/v1_0/requesttopay/{id}` ; Airtel : `GET /standard/v1/payments/{id}`). La tâche `verifierPaiements` relit chaque minute les paiements en attente depuis moins de 48 h.
- Numérotation : table `counters` incrémentée par une requête unique qui verrouille la ligne, dans la transaction de l’enregistrement. Le numéro de reçu n’est tiré qu’au passage au statut « Payé ». Les candidatures de démonstration reprennent les numéros de la maquette (C-0037 à C-0043).
- Les écritures sur un même dossier depuis l’écran 04 sont envoyées l’une après l’autre (sinon deux mises à jour simultanées de Payload s’écrasent).
- Les champs de candidature obligatoires en ligne (tranche d’âge, description, ancienneté, objectifs) ne le sont pas pour un bulletin papier ; le consentement et l’acceptation des textes restent obligatoires.

## Incident du 25/10/2026 : dossier `media`

Pendant le lot 9, le dossier `media` du poste de développement (images téléversées, hors dépôt) est devenu illisible pour le système de fichiers (« fichier ou répertoire endommagé »). Il a été mis de côté et les 48 images ont été régénérées à partir de leurs sources (`design/images`, `seed/fichiers`) avec le même nom de fichier ; rien n’a été perdu dans la base. À surveiller sur ce poste (vérification du disque conseillée). En production, les médias seront sauvegardés avec la base (lot 12).

## Lot 6 : notes

- Sessions : `members` utilise les sessions de Payload. La connexion par lien et l’activation ouvrent une session par `src/lib/membres/session.ts` (même mécanisme que Payload : session ajoutée au membre, identifiant signé dans le jeton). Sans « Rester connecté », le cookie vit 30 minutes et `src/proxy.ts` le prolonge à chaque page ; un cookie repère (`rec242_session`) permet d’afficher « Session expirée ». La déconnexion ferme la session côté serveur.
- Cookies et API : Payload n’accepte le cookie de session que pour une requête du même site (en-tête `Origin` autorisé ou `Sec-Fetch-Site`) ; un client hors navigateur doit utiliser l’en-tête `Authorization: JWT …`.
- Jetons à usage unique (activation 72 h, lien de connexion 15 min) : seule leur empreinte SHA-256 est enregistrée, le jeton est effacé à l’usage. Le lien de réinitialisation (1 h) est celui de Payload (`/espace-membre/mot-de-passe/[jeton]`).
- QR de la carte : `REC242:M:<numéro>:<signature HMAC>` (aucune donnée personnelle) ; `verifierJetonCarte` servira au pointage (lot 8).
- Cotisation : en attendant les échéances du lot 11 (`dues`), la situation est calculée à partir des montants copiés sur la fiche et des paiements rattachés au membre (`src/lib/membres/cotisation.ts`).
- Import CSV : les comptes importés sont « en attente d’activation » et hors annuaire (pas de consentement connu) ; le lien d’activation se renvoie depuis la fiche. Colonnes du modèle : `numero_adherent;prenom;nom;email;telephone;categorie;entreprise;secteurs;ville;quartier;date_adhesion`.
- Données de démonstration : six membres de l’annuaire de la maquette (mot de passe `SEED_PASSWORD`), dont Christelle Malonga (`christelle@kimiacreations.cg`, REC-2026-0137, 2e tranche due) ; Léon Massamba, d’abord suspendu, est actif depuis l’alignement sur la maquette (sa fiche figure dans l’annuaire) et les tests le suspendent le temps de leur vérification (`tests/helpers/temporaire.ts`) ; compteur des numéros 2026 placé à 137.

## Alignement visuel du site et de l’espace membre (26/10/2026)

Méthode (`scripts/audit-visuel`, compilation de production `next build` puis `next start`) :

- `pnpm audit:visuel` capture les 82 écrans (1440 × 900 et 390 × 900 px, animations réduites comme dans les références) et les compare à `captures/`.
- `pnpm audit:maquette` rend la maquette elle-même dans le même navigateur. Contre `captures/`, la maquette s’écarte déjà de 1,3 à 6,7 % au premier écran, à hauteur identique : c’est le bruit du moteur de rendu (lissage des polices, anticrénelage, images redimensionnées). La cible de 2 % ne peut donc pas être atteinte contre les webp.
- La comparaison qui fait foi est donc faite contre la maquette rendue sans ses contrôles « Démo » (`SANS_DEMO=1`, puis `pnpm audit:reel`). Une différence y vient de l’intégration, pas du moteur.
- Les références mobiles ont été prises dans une fenêtre de 900 px de haut (barre d’onglets fixe à 831 px). La capture utilise la même hauteur ; la comparaison porte sur les 844 premiers pixels.
- Résultat : 68 écrans sur 82 dans la cible (≤ 2 % au premier écran, hauteur à ± 1 %). Au départ : 3 écrans sur 82.

Écrans hors cible et cause :

| Écran | Cause prouvée |
|---|---|
| espace 05 opportunités (M + 13 %, D − 2 %) | La maquette de l’espace membre montre 5 annonces et 5 types ; celle du site (écran 17) montre en plus « Salon professionnel : appel à exposants », public. Une annonce publique est lisible par les membres (docs/05 §8) : elle apparaît aussi dans l’espace (une carte et une pastille de plus). Les deux maquettes se contredisent sur la même donnée. |
| espace 07 annuaire (M 11,5 %, + 4 % ; D + 5 %) | La maquette de l’espace code en dur 6 fiches et une liste de secteurs sans Artisanat (`maquette/espace-membre/index.html`, liste des secteurs), alors que Ferme Lékana et Batimat Congo ont consenti à l’annuaire et figurent sur l’écran 12 du site. Les consentements réels (docs/05 §6) imposent 8 fiches visibles pour Christelle (la sienne exclue), d’où « Page 1 sur 2 » et deux pastilles de plus. |
| espace 08 fiche (M 21 %) | La présentation de Khazad est, dans la maquette du site (écran 13), « Texte rédigé par le membre… Relu par le secrétariat avant publication. » ; la maquette de l’espace l’affiche sans la dernière phrase. C’est la même donnée : une ligne de plus décale la photo de 25 px. |
| site 12 membres (M 6,7 %) | La maquette ne montre que les 6 premiers secteurs (`SECTEURS.slice(0, 6)` dans `maquette/site/index.html`), alors que ses propres fiches ont les secteurs Transport et Artisanat. Le filtre liste les secteurs et villes réellement utilisés (docs/06 : filtre par secteur), soit 4 pastilles de plus (+ 48 px). |
| site 13 membre (D − 3 %, M − 2 %) | La ligne « Commission » de la fiche visiteur n’est pas affichée : docs/05 §6 et docs/06 (écran 13) la réservent au membre connecté. |
| site 14 agenda (M 2,1 %, + 1,3 %) | « Porteurs de projets et investisseurs » est « Sur invitation » sur le site et « Réservé aux membres » dans l’espace (même donnée, voir QUESTIONS n° 9), d’où une ligne de plus. Le reste de l’écart est le rééchantillonnage des photos : même cadrage, mais l’image servie fait 400 px de large contre 960 à 1000 px dans la maquette. |
| site 09 adhérer (M 2,1 %) | Rééchantillonnage de la photo du commerçant, entre 560 et 731 px : même cadrage (`cover`, 70 % 30 %) et même boîte (358 × 220), mais l’image servie fait 390 px de large contre 960 dans la maquette. Il n’y a aucun écart de mise en page. |
| site 16 événement passé (D − 11 %, M − 7 %) | La maquette montre la carte d’aide « Participants : affiché seulement s’il est renseigné » (docs/06 §16 : « seulement si renseigné », et aucun chiffre ne s’invente) et une ligne « Règlement intérieur » qui pointe vers un document réservé aux membres : un lien mort pour un visiteur. |
| site 19 actualités (D − 24 %, M − 30 %) | La maquette montre chaque actualité deux fois, en version publique et réservée. docs/06 (écran 19) impose une seule carte par actualité en production. |

Données de démonstration : textes, ordres, dates (relatives au jour de la maquette, le 21 octobre 2026), images et cadrages de la maquette (`src/seed/alignement.ts`, lancé par le seed). Les données des tests E2E sont retirées en fin de suite (`tests/e2e/nettoyage.ts`). Choix notés dans QUESTIONS (n° 7 à 9).

Mesures écran par écran (compilation de production) :

| Écran | 1er écran contre captures/ | 1er écran contre la maquette sans démo | Hauteur (maquette → intégration) | Cible |
|---|---|---|---|---|
| espace-membre/01-connexion-mobile | 27,9 % | 0,2 % | 900 → 900 (+0,0 %) | oui |
| espace-membre/01-connexion-ordinateur | 10,2 % | 0,1 % | 900 → 900 (+0,0 %) | oui |
| espace-membre/02-tableau-mobile | 4,4 % | 0,6 % | 3528 → 3553 (+0,7 %) | oui |
| espace-membre/02-tableau-ordinateur | 3,6 % | 0,5 % | 1877 → 1877 (+0,0 %) | oui |
| espace-membre/03-profil-mobile | 4,7 % | 0,6 % | 4236 → 4219 (−0,4 %) | oui |
| espace-membre/03-profil-ordinateur | 3,3 % | 0,1 % | 2342 → 2342 (+0,0 %) | oui |
| espace-membre/04-evenements-mobile | 5,2 % | 1,8 % | 2295 → 2295 (+0,0 %) | oui |
| espace-membre/04-evenements-ordinateur | 3 % | 0,5 % | 1150 → 1150 (+0,0 %) | oui |
| espace-membre/05-opportunites-mobile | 24,6 % | 21,9 % | 3348 → 3785 (+13,1 %) | non |
| espace-membre/05-opportunites-ordinateur | 3,7 % | 0,8 % | 2018 → 1974 (−2,2 %) | non |
| espace-membre/06-publier-mobile | 3,3 % | 0,1 % | 908 → 908 (+0,0 %) | oui |
| espace-membre/06-publier-ordinateur | 1,6 % | 0 % | 1042 → 1042 (+0,0 %) | oui |
| espace-membre/07-annuaire-mobile | 12,4 % | 11,5 % | 2564 → 2671 (+4,2 %) | non |
| espace-membre/07-annuaire-ordinateur | 4 % | 0,5 % | 1114 → 1175 (+5,5 %) | non |
| espace-membre/08-fiche-mobile | 23,6 % | 21,1 % | 1658 → 1676 (+1,1 %) | non |
| espace-membre/08-fiche-ordinateur | 3,3 % | 1,5 % | 1236 → 1236 (+0,0 %) | oui |
| espace-membre/09-experts-mobile | 6,9 % | 0,5 % | 2133 → 2116 (−0,8 %) | oui |
| espace-membre/09-experts-ordinateur | 3,4 % | 0,2 % | 1276 → 1276 (+0,0 %) | oui |
| espace-membre/10-messages-mobile | 5,6 % | 0,2 % | 1424 → 1424 (+0,0 %) | oui |
| espace-membre/10-messages-ordinateur | 3,3 % | 0,7 % | 1042 → 1042 (+0,0 %) | oui |
| espace-membre/11-cotisation-mobile | 3,6 % | 0,6 % | 2046 → 2046 (+0,0 %) | oui |
| espace-membre/11-cotisation-ordinateur | 3,6 % | 0,5 % | 1112 → 1112 (+0,0 %) | oui |
| espace-membre/12-documents-mobile | 5,1 % | 0,5 % | 1555 → 1555 (+0,0 %) | oui |
| espace-membre/12-documents-ordinateur | 3 % | 0,2 % | 1042 → 1042 (+0,0 %) | oui |
| espace-membre/13-carte-mobile | 5,6 % | 1,2 % | 1038 → 1038 (+0,0 %) | oui |
| espace-membre/13-carte-ordinateur | 2,2 % | 0,3 % | 1042 → 1042 (+0,0 %) | oui |
| site/01-accueil-mobile | 6,9 % | 1,9 % | 12763 → 12773 (+0,1 %) | oui |
| site/01-accueil-ordinateur | 2,6 % | 0,1 % | 8021 → 8021 (+0,0 %) | oui |
| site/02-reseau-mobile | 6,9 % | 1,2 % | 8076 → 8086 (+0,1 %) | oui |
| site/02-reseau-ordinateur | 1,9 % | 0,1 % | 5307 → 5307 (+0,0 %) | oui |
| site/03-gouvernance-mobile | 4,4 % | 0,2 % | 8563 → 8573 (+0,1 %) | oui |
| site/03-gouvernance-ordinateur | 2 % | 0,1 % | 5096 → 5096 (+0,0 %) | oui |
| site/04-commissions-mobile | 6,3 % | 1 % | 5429 → 5439 (+0,2 %) | oui |
| site/04-commissions-ordinateur | 2,9 % | 0,8 % | 3543 → 3543 (+0,0 %) | oui |
| site/05-antennes-mobile | 3,6 % | 0,2 % | 4483 → 4493 (+0,2 %) | oui |
| site/05-antennes-ordinateur | 1,8 % | 0,1 % | 2373 → 2373 (+0,0 %) | oui |
| site/06-ecosysteme-mobile | 5 % | 0,7 % | 3587 → 3597 (+0,3 %) | oui |
| site/06-ecosysteme-ordinateur | 2,3 % | 0,4 % | 2615 → 2615 (+0,0 %) | oui |
| site/07-partenaires-mobile | 4,1 % | 0,6 % | 4391 → 4401 (+0,2 %) | oui |
| site/07-partenaires-ordinateur | 1,8 % | 0,2 % | 2752 → 2752 (+0,0 %) | oui |
| site/08-partenariat-mobile | 2,9 % | 0,2 % | 2304 → 2314 (+0,4 %) | oui |
| site/08-partenariat-ordinateur | 1,4 % | 0,1 % | 1505 → 1505 (+0,0 %) | oui |
| site/09-adherer-mobile | 6,2 % | 2,1 % | 10793 → 10803 (+0,1 %) | non |
| site/09-adherer-ordinateur | 2 % | 0,3 % | 5797 → 5797 (+0,0 %) | oui |
| site/10-candidature-mobile | 2,4 % | 0,4 % | 2497 → 2507 (+0,4 %) | oui |
| site/10-candidature-ordinateur | 1,6 % | 0,2 % | 1545 → 1545 (+0,0 %) | oui |
| site/11-merci-mobile | 4,6 % | 0,9 % | 2859 → 2857 (−0,1 %) | oui |
| site/11-merci-ordinateur | 2,3 % | 0,2 % | 1761 → 1749 (−0,7 %) | oui |
| site/12-membres-mobile | 24,8 % | 6,7 % | 5325 → 5383 (+1,1 %) | non |
| site/12-membres-ordinateur | 3,9 % | 1,1 % | 3042 → 3042 (+0,0 %) | oui |
| site/13-membre-mobile | 47,9 % | 0,2 % | 3158 → 3109 (−1,6 %) | non |
| site/13-membre-ordinateur | 10,8 % | 0,3 % | 1951 → 1892 (−3,0 %) | non |
| site/14-agenda-mobile | 4,3 % | 2,1 % | 3635 → 3681 (+1,3 %) | non |
| site/14-agenda-ordinateur | 1,4 % | 0,2 % | 1895 → 1895 (+0,0 %) | oui |
| site/15-evenement-mobile | 47,4 % | 1 % | 4044 → 4054 (+0,2 %) | oui |
| site/15-evenement-ordinateur | 4,5 % | 0,1 % | 2645 → 2645 (+0,0 %) | oui |
| site/16-evenementpasse-mobile | 4,7 % | 1 % | 3203 → 2968 (−7,3 %) | non |
| site/16-evenementpasse-ordinateur | 2 % | 0,1 % | 1990 → 1777 (−10,7 %) | non |
| site/17-opportunites-mobile | 5,9 % | 1,1 % | 5064 → 5074 (+0,2 %) | oui |
| site/17-opportunites-ordinateur | 3,2 % | 0,7 % | 3071 → 3071 (+0,0 %) | oui |
| site/18-formalisation-mobile | 6,4 % | 1,5 % | 4631 → 4641 (+0,2 %) | oui |
| site/18-formalisation-ordinateur | 1,8 % | 0,3 % | 2884 → 2884 (+0,0 %) | oui |
| site/19-actualites-mobile | 5,2 % | 1,9 % | 7335 → 5144 (−29,9 %) | non |
| site/19-actualites-ordinateur | 2,1 % | 1 % | 3675 → 2789 (−24,1 %) | non |
| site/20-article-mobile | 5,4 % | 0,9 % | 3235 → 3245 (+0,3 %) | oui |
| site/20-article-ordinateur | 1,5 % | 0,1 % | 2637 → 2637 (+0,0 %) | oui |
| site/21-presse-mobile | 4 % | 0,2 % | 3646 → 3656 (+0,3 %) | oui |
| site/21-presse-ordinateur | 1,8 % | 0,1 % | 2289 → 2289 (+0,0 %) | oui |
| site/22-contact-mobile | 3,6 % | 0,2 % | 4095 → 4105 (+0,2 %) | oui |
| site/22-contact-ordinateur | 2,2 % | 0,1 % | 2423 → 2423 (+0,0 %) | oui |
| site/23-recherche-mobile | 3,5 % | 0,2 % | 2558 → 2546 (−0,5 %) | oui |
| site/23-recherche-ordinateur | 1,8 % | 0,2 % | 1577 → 1577 (+0,0 %) | oui |
| site/24-plan-mobile | 3,6 % | 0,2 % | 2794 → 2804 (+0,4 %) | oui |
| site/24-plan-ordinateur | 1,8 % | 0,1 % | 1659 → 1659 (+0,0 %) | oui |
| site/25-mentions-mobile | 5,9 % | 0,2 % | 2398 → 2408 (+0,4 %) | oui |
| site/25-mentions-ordinateur | 2,3 % | 0,1 % | 1661 → 1661 (+0,0 %) | oui |
| site/26-confidentialite-mobile | 6,8 % | 0,2 % | 2677 → 2687 (+0,4 %) | oui |
| site/26-confidentialite-ordinateur | 2,9 % | 0,1 % | 1850 → 1850 (+0,0 %) | oui |
| site/27-conditions-mobile | 6,6 % | 1,4 % | 2646 → 2656 (+0,4 %) | oui |
| site/27-conditions-ordinateur | 3,2 % | 0,8 % | 1783 → 1783 (+0,0 %) | oui |
| site/28-erreur404-mobile | 3,6 % | 0,3 % | 1925 → 1935 (+0,5 %) | oui |
| site/28-erreur404-ordinateur | 2,3 % | 0,3 % | 1155 → 1155 (+0,0 %) | oui |

## Lot 12 : sécurité (26/10/2026)

- En-têtes HTTP (`next.config.ts`, toutes les adresses, API comprise) : `Content-Security-Policy` (tout est servi par le site ; `'unsafe-inline'` pour les scripts inline de Next sur des pages statiques ou revalidées, incompatibles avec un nonce par requête ; `'unsafe-eval'` et WebSocket seulement en développement ; admin : `cdn.jsdelivr.net` pour l’éditeur JSON de Payload ; `frame-ancestors 'self'` pour l’aperçu en direct), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (caméra autorisée seulement sous `/admin`, pour le scanner de pointage), `Strict-Transport-Security` en production seulement (un an, sans `includeSubDomains` tant que les sous-domaines de rec242.cg ne sont pas connus).
- CSRF : Payload n’accepte le cookie de session que d’une origine de sa liste (`serverURL`, ajouté automatiquement) ou avec `Sec-Fetch-Site` même site ; les actions serveur sont protégées par le contrôle d’origine de Next ; les routes maison sont en lecture (GET) ou, pour le rappel des opérateurs de paiement, ne font que relire le statut chez l’opérateur.
- Droits alignés sur `04-roles-et-droits.md` : demandes des membres (mises en relation, questions aux experts, messages du réseau) réservées au super admin, à l’admin et au responsable membres ; demandes pour les commissions lisibles aussi par l’éditeur ; cotisations et encarts de l’annuaire plus lisibles par le responsable événements ; discipline : décisions par le super admin et l’admin, lecture par le responsable membres (le responsable membres ne conduit plus la procédure, contrairement à l’utilisatrice de démonstration de l’écran 06) ; pièces jointes des échanges lisibles par l’équipe concernée seulement ; FAQ, partenaires, témoignages et personnes non publiés invisibles pour un membre connecté ; paramètres du site modifiables par le super admin et l’admin seulement (l’éditeur n’y change rien), alertes et réponses types jamais renvoyées au public.
- Règles côté serveur : un éditeur (pages) ou un responsable événements (actualités) ne modifie plus directement un contenu publié (enregistrement hors brouillon refusé) ; numéro de billet, pointage et rappel jamais repris d’une inscription envoyée par un membre ; pièce jointe d’une annonce ou d’une réponse forcément déposée par le membre ; un membre ne réécrit plus la date de réponse ni le signalement d’une mise en relation ; un membre suspendu ou ancien membre perd ses sessions ouvertes (son jeton ne vaut plus pour l’API).
- Liens d’e-mail et favoris : le navigateur les annonce comme venant d’ailleurs (`Sec-Fetch-Site: cross-site` ou `none`) et Payload ignore alors le cookie. Plutôt que d’affaiblir ce contrôle, l’espace membre renvoie un membre qui a un cookie vers `/espace-membre/ouverture`, page du site qui recharge l’adresse demandée (seulement une adresse de l’espace membre) : la requête suivante part du site et la session est reconnue.
- Tests : `tests/int/securite.int.spec.ts` (visiteur, membre contre membre, six rôles, paramètres, sessions fermées à la suspension) et `tests/e2e/securite.e2e.spec.ts` (en-têtes, pages protégées, API REST par rôle, CSRF).

## Back-office : alignement visuel (26/10/2026)

Même méthode que pour le site (compilation de production, maquette rendue par le même navigateur ; la maquette du back-office n’a pas de contrôle « Démo »). Outillage : `scripts/audit-visuel/capture-bo.cjs` (22 écrans de docs/08 aux deux largeurs, les écrans de détail ouvrent l’enregistrement de la maquette : C-0041, REC-2026-0137, l’afterwork, « Les adhésions bientôt ouvertes en ligne », « Fourniture d’équipements informatiques », la page Antennes), `ZONES=back-office` pour `plancher.cjs` et `compare.cjs`, `pnpm audit:bo`. Compte de capture : ange.mouandza@rec242.test (super administrateur).

Fait :

- Cadre commun : barre du haut de la maquette (`BarreHaut.tsx` : titre de l’écran, recherche globale sur les membres et candidatures avec les droits de l’utilisateur, personne connectée, déconnexion, menu mobile), menu de 260 px avec pastilles calculées au rendu, gouttières et typographie de la maquette ; `/admin/cotisations` rendu dans le cadre de l’admin (il s’affichait sans menu).
- Connexion (01) : fond, carte et titre de la maquette (dans la cible aux deux largeurs).
- Listes natives (09, 14, 16, 17, 18) : barre de la maquette, tableau sans cases à cocher ni tri, cellules de la maquette (photos, couvertures, dates), fiches empilées sur mobile, journal en frise, matrice des permissions, onglets Contenus.
- Éditeurs (10, 15, 20, 22) : onglets en pastilles, panneaux, « Enregistrer », « Publier », « Prévisualiser », historique des versions avec « Restaurer », aperçu en direct de la carte d’opportunité, blocs titrés « Bloc · … ».
- Vues personnalisées (02 à 08, 11 à 13, 19, 21) : titre et onglets natifs masqués au-dessus des vues de document, tableau de bord réduit aux quatre compteurs et blocs de docs/08, cotisations conformes à docs/08 (quatre compteurs, relances envoyées par « Envoyer les relances dues »), photos des participants, événements à venir d’abord.
- Données : purge des versions orphelines et des comptes de test, utilisateurs, documents, journal et brouillons de la maquette (`src/seed/backoffice.ts`), inscriptions et encarts de l’annuaire. Les tests d’intégration nettoient désormais leurs données (`tests/int/nettoyage.ts`).

Résultat : 3 écrans sur 44 dans la cible (au départ : 0). Causes des écarts restants :

| Cause | Écrans |
|---|---|
| Les données de démonstration suivent le site et l’espace membre (déjà alignés), qui montrent plus de lignes que la maquette du back-office : 9 membres au lieu de 4, 8 actualités au lieu de 4, 14 pages au lieu de 10, 12 paiements au lieu de 3, 42 inscrits à l’afterwork, 5 événements. La maquette du back-office marque aussi « Les Bretelles de Léon » suspendu, actif sur le site et dans l’espace membre. | 05, 07, 08, 09, 11, 12, 14, 18 (hauteurs + 20 % à + 330 %) |
| Éléments imposés par docs/08 absents de la maquette : filtres et recherche (05, 17), « Masquer la fiche », « Enregistrer un décès » (06), « Exporter », « Saisir une candidature papier » (03), groupe « Plan d’accès » et réseaux sociaux (15), onglet Témoignages (14). | 03, 05, 06, 14, 15, 17 |
| Pas de photo pour les candidats, les expéditeurs de messages et les visiteurs inscrits (aucun champ dans docs/03) : initiales à la place. | 03, 04, 08, 13 |
| Le journal enregistre chaque connexion (docs/08 §17) : celles de la capture et des tests passent devant les 5 entrées de la maquette. Les compteurs de documents personnels sont calculés (la maquette affiche des chiffres inventés, 412 et 248). | 17, 18 |
| Formulaires de Payload : les blocs de pages et les actualités ont des champs techniques (section, image, boutons, adresse, rang, à la une, signature) que la maquette ne dessine pas ; le panneau latéral garde les champs de modération. | 10, 20, 22 (hauteurs + 33 % à + 195 %) |
| Personne connectée : Béryl Bobanda dans la maquette, le super administrateur dans la capture (nom, rôle et initiales de la barre du haut). | tous |

Reste à faire pour aller plus loin : refaire en vues personnalisées les éditeurs d’actualité, de page et d’opportunité (10, 20, 22) au lieu d’habiller les formulaires natifs ; trancher avec REC 242 les contradictions de données entre la maquette du back-office et celle du site.

Mesures écran par écran (compilation de production) :

| Écran | Départ (1er écran, hauteur) | Contre captures/ | Contre la maquette rendue | Hauteur (maquette → intégration) | Cible |
|---|---|---|---|---|---|
| 01-connexion-mobile | 25,4 %, ×1,00 | 5 % | 1,4 % | 900 → 900 (+0,0 %) | oui |
| 01-connexion-ordinateur | 11,7 %, ×1,00 | 1,1 % | 0,1 % | 900 → 900 (+0,0 %) | oui |
| 02-tableau-mobile | 26,2 %, ×1,26 | 27,6 % | 27,9 % | 2434 → 2465 (+1,3 %) | non |
| 02-tableau-ordinateur | 21,6 %, ×1,40 | 4,1 % | 1 % | 1289 → 1289 (+0,0 %) | oui |
| 03-candidatures-mobile | 18,5 %, ×1,00 | 18,1 % | 18,5 % | 2450 → 2458 (+0,3 %) | non |
| 03-candidatures-ordinateur | 8,9 %, ×0,96 | 10,2 % | 8,9 % | 934 → 900 (−3,6 %) | non |
| 04-candidature-mobile | 33,3 %, ×1,03 | 20,7 % | 20,8 % | 2412 → 2390 (−0,9 %) | non |
| 04-candidature-ordinateur | 21,7 %, ×1,07 | 11,6 % | 10,1 % | 1188 → 1202 (+1,2 %) | non |
| 05-membres-mobile | 20,5 %, ×2,11 | 20,1 % | 20,5 % | 1322 → 2795 (+111,4 %) | non |
| 05-membres-ordinateur | 42,8 %, ×1,06 | 43,3 % | 42,8 % | 934 → 986 (+5,6 %) | non |
| 06-membre-mobile | 32,9 %, ×1,11 | 17,3 % | 17,5 % | 2136 → 2270 (+6,3 %) | non |
| 06-membre-ordinateur | 25,6 %, ×1,01 | 11,7 % | 10,1 % | 1167 → 1112 (−4,7 %) | non |
| 07-evenements-mobile | 36,1 %, ×1,21 | 23,3 % | 23,7 % | 1675 → 2021 (+20,7 %) | non |
| 07-evenements-ordinateur | 21,3 %, ×1,02 | 14,7 % | 12,8 % | 934 → 931 (−0,3 %) | non |
| 08-evenement-mobile | 46,8 %, ×4,31 | 17,7 % | 17,7 % | 1726 → 7370 (+327,0 %) | non |
| 08-evenement-ordinateur | 29,2 %, ×3,52 | 11,2 % | 9,6 % | 934 → 3228 (+245,6 %) | non |
| 09-actualites-mobile | 41,4 %, ×0,96 | 14 % | 14,1 % | 1103 → 2047 (+85,6 %) | non |
| 09-actualites-ordinateur | 31,9 %, ×0,95 | 23,1 % | 21,8 % | 934 → 900 (−3,6 %) | non |
| 10-editeur-mobile | 61,4 %, ×1,68 | 36,2 % | 36,8 % | 1851 → 2471 (+33,5 %) | non |
| 10-editeur-ordinateur | 49,6 %, ×1,97 | 28 % | 28,6 % | 1058 → 1455 (+37,5 %) | non |
| 11-opportunites-mobile | 17,4 %, ×1,59 | 17,2 % | 17,4 % | 1829 → 2914 (+59,3 %) | non |
| 11-opportunites-ordinateur | 20,6 %, ×1,27 | 21,6 % | 20,6 % | 934 → 1187 (+27,1 %) | non |
| 12-cotisations-mobile | 32,8 %, ×2,42 | 16,6 % | 17,1 % | 2263 → 5208 (+130,1 %) | non |
| 12-cotisations-ordinateur | 18,1 %, ×1,87 | 13,6 % | 12,2 % | 940 → 1620 (+72,3 %) | non |
| 13-messages-mobile | 22,4 %, ×1,03 | 21,7 % | 22,4 % | 2007 → 2059 (+2,6 %) | non |
| 13-messages-ordinateur | 3 %, ×1,04 | 6,3 % | 3 % | 1085 → 1129 (+4,1 %) | non |
| 14-contenus-mobile | 51,4 %, ×0,75 | 23,1 % | 23,6 % | 1910 → 2635 (+38,0 %) | non |
| 14-contenus-ordinateur | 38,1 %, ×1,00 | 11,2 % | 9,6 % | 934 → 1118 (+19,7 %) | non |
| 15-parametres-mobile | 63 %, ×1,21 | 17,7 % | 14,9 % | 900 → 1227 (+36,3 %) | non |
| 15-parametres-ordinateur | 40 %, ×1,05 | 29,2 % | 27,6 % | 934 → 900 (−3,6 %) | non |
| 16-utilisateurs-mobile | 64,7 %, ×0,36 | 11,7 % | 11,2 % | 3068 → 3350 (+9,2 %) | non |
| 16-utilisateurs-ordinateur | 37,9 %, ×1,00 | 9,7 % | 6,7 % | 1609 → 1674 (+4,0 %) | non |
| 17-journal-mobile | 51,6 %, ×1,50 | 27,5 % | 28,3 % | 900 → 1471 (+63,4 %) | non |
| 17-journal-ordinateur | 35,7 %, ×0,99 | 33,1 % | 32,1 % | 934 → 953 (+2,0 %) | non |
| 18-documents-mobile | 50,2 %, ×0,72 | 21,6 % | 22 % | 2468 → 3649 (+47,9 %) | non |
| 18-documents-ordinateur | 40,9 %, ×1,25 | 17,4 % | 16,8 % | 1025 → 1327 (+29,5 %) | non |
| 19-commissions-mobile | 10,9 %, ×0,99 | 10,8 % | 10,9 % | 3176 → 3158 (−0,6 %) | non |
| 19-commissions-ordinateur | 5,9 %, ×1,02 | 8,6 % | 5,9 % | 1247 → 1267 (+1,6 %) | non |
| 20-opportunite-mobile | 57,9 %, ×1,31 | 25,8 % | 26,4 % | 1856 → 3067 (+65,2 %) | non |
| 20-opportunite-ordinateur | 43,6 %, ×1,56 | 23,6 % | 23 % | 1096 → 1788 (+63,1 %) | non |
| 21-demandes-mobile | 17,1 %, ×0,86 | 17,5 % | 17,1 % | 1707 → 1461 (−14,4 %) | non |
| 21-demandes-ordinateur | 14,6 %, ×0,96 | 16,5 % | 14,6 % | 934 → 900 (−3,6 %) | non |
| 22-page-mobile | 29,2 %, ×4,19 | 22,7 % | 23,2 % | 3024 → 7392 (+144,4 %) | non |
| 22-page-ordinateur | 25,4 %, ×4,69 | 17 % | 16,4 % | 1598 → 4696 (+193,9 %) | non |

## Lot 12 : performance, Lighthouse mobile (27/10/2026)

Mesure : Lighthouse 12.8.2, Edge sans interface, profil mobile simulé (4G lente, processeur ralenti ×4), compilation de production (`next build` puis `next start`), 3 passages par page, médiane. Poste de développement Windows dont l'indice de référence Lighthouse est de 550 à 640 (machine lente) : une même page varie de 10 à 25 points d'un passage à l'autre.

**Résultat : le seuil de 90 en performance n'est pas atteint sur ce poste.** Accessibilité, bonnes pratiques et SEO sont à 90 ou plus partout (le SEO de 58 sur la connexion de l'espace membre est voulu : page en `noindex`).

| Page | Avant (perf / access. / BP / SEO) | Après | LCP avant → après | TBT avant → après | JS transféré |
|---|---|---|---|---|---|
| Accueil | 60 / 100 / 100 / 100 | 66 / 100 / 100 / 100 | 4,60 → 4,00 s | 879 → 937 ms | 152 → 149 Ko |
| Le réseau | 69 / 96 / 100 / 100 | 70 / 96 / 100 / 100 | 3,99 → 3,84 s | 1074 → 696 ms | 154 → 151 Ko |
| Adhérer | 70 / 100 / 100 / 100 | 75 / 100 / 100 / 100 | 3,74 → 3,65 s | 718 → 566 ms | 151 → 149 Ko |
| Membres | 84 / 96 / 100 / 100 | 80 / 96 / 100 / 100 | 2,22 → 3,82 s | 371 → 313 ms | 151 → 149 Ko |
| Agenda | 76 / 96 / 100 / 100 | 78 / 96 / 100 / 100 | 3,04 → 4,28 s | 581 → 324 ms | 151 → 149 Ko |
| Fiche événement | 58 / 100 / 100 / 100 | 80 / 100 / 100 / 100 | 3,44 → 4,00 s | 1284 → 282 ms | 154 → 153 Ko |
| Opportunités | 69 / 100 / 100 / 100 | 81 / 100 / 100 / 100 | 2,50 → 4,03 s | 1202 → 273 ms | 151 → 149 Ko |
| Actualités | 72 / 100 / 100 / 100 | 79 / 100 / 100 / 100 | 3,01 → 4,27 s | 866 → 257 ms | 151 → 149 Ko |
| Article | 77 / 100 / 100 / 100 | 82 / 100 / 100 / 100 | 4,12 → 3,70 s | 1134 → 311 ms | 152 → 151 Ko |
| Contact | 79 / 100 / 100 / 100 | 73 / 100 / 100 / 100 | 3,80 → 3,94 s | 278 → 470 ms | 154 → 152 Ko |
| Connexion espace membre | 92 / 100 / 100 / 58 | 89 / 100 / 100 / 58 | 2,74 → 3,19 s | 225 → 241 ms | 153 Ko |

Le gain net porte sur le temps de blocage (TBT), divisé par 2 à 4 sur la plupart des pages. Les variations du LCP de ±1 s entre deux séries d'une même version sont du bruit de mesure.

Changements (aucun changement visible) :
- `src/styles/animations.css` : le halo du héros (accueil, Le réseau) n'anime plus deux propriétés CSS enregistrées et héritées (`--mb-h`, `--mb-t`), qui recalculaient le style de toute la section à chaque image ; le halo et ses pastilles portent leurs propres animations (mêmes courbes, mêmes durées). Effet isolé : recalcul de style de 492 ms à 92 ms dans la trace de l'accueil. Écart assumé, invisible : le halo étant masqué sur mobile, franchir le seuil de largeur rejoue son entrée.
- Avatars et logos de l'accueil et de l'annuaire en `loading="lazy"` (ils étaient chargés d'emblée, en concurrence avec l'image du LCP).
- `prefetch={false}` sur les liens du site public : une vingtaine de préchargements `?_rsc` en moins après l'ouverture de la page.
- Image prioritaire du héros en `decoding="sync"` (la valeur `sizes` est gardée : un essai à `100vw` choisissait une variante plus floue et faisait passer l'écart visuel de l'accueil mobile de 1,9 % à 6,5 %).
- `public/js/rec-motion.min.js` : version minifiée du moteur d'animation (`rec-motion.js` reste la source lisible).
- Icône d'onglet `logo-rec242-96.png` (6 Ko au lieu de 37 Ko).
- `next.config.ts` : durées de cache pour `/fonts` (1 an), `/images` (7 jours), `/js` et la médiathèque publique `/api/media/file` (1 jour, lecture libre). En-têtes de sécurité et CSP inchangés.

Essais abandonnés : `content-visibility:auto` (faux échecs de contraste en accessibilité, CLS 0,089 sur un passage), `experimental.inlineCss` (HTML de 17 à 53 Ko, résultats pires), suppression complète du moteur d'animation à titre de plafond (l'accueil reste à 76/77 : les animations ne sont pas la seule cause).

Ce qui reste sous 90, et pourquoi :
- LCP simulé de 3,2 à 4,3 s. Sur l'accueil, l'élément LCP est l'image du héros ; sur les pages à bandeau texte, c'est le bandeau `.band.phead` et son fond SVG, qui attend les deux feuilles de style bloquantes (21 Ko compressés). La première mise en page coûte 190 à 300 ms réels sur ce poste (environ 1 s après le ralentissement ×4). Le LCP réellement observé reste sous 1 s.
- TBT de 250 à 950 ms : l'hydratation React et le routeur Next coûtent à eux seuls environ 500 ms simulés, avant tout code de la maquette. L'accueil et Le réseau sont les plus lourds (mots animés du héros, halo, environ 800 nœuds).
- Accessibilité 96 sur Le réseau, l'agenda et l'annuaire : audit `target-size`, qui mesure les boutons du héros pendant leur animation d'entrée. Résultat dépendant de l'instant de l'audit ; le corriger demanderait de changer l'animation.

Budget de `docs/02` : CLS sous 0,1 respecté partout (0 à 0,023) ; JavaScript compressé d'environ 143 Ko en contenu (149 à 153 Ko transférés, en-têtes compris), dont 115 Ko pour React et le routeur Next ; LCP sous 2,5 s non respecté en simulation sur ce poste.

À faire sur la préproduction Linux : remesurer (même protocole), activer brotli dans Nginx (environ 130 Ko de JavaScript). Pistes qui changent l'apparence ou les animations de la maquette, à valider avec REC 242 avant tout travail : alléger le héros de l'accueil (moins de mots animés), ne plus faire du fond SVG des bandeaux l'élément LCP, découper `site.css` (71 Ko, en grande partie inutilisé sur chaque page).

Vérifications : `tsc --noEmit` et ESLint sans erreur ; `next build` réussi depuis un dossier `.next` vidé ; tests d'intégration 54 / 54 ; E2E du site, de l'adhésion, de l'annuaire, des événements, des opportunités et de la sécurité 33 / 33 (6 échecs au premier passage, tous par délai dépassé pendant la première compilation des pages par le serveur de développement, puis réussis au second passage) ; audit visuel inchangé à 68 / 82 écrans conformes contre la maquette sans démo (la page Merci doit être capturée avec `AUDIT_MERCI_ID` réglé sur une candidature existante).

## Lot 12 : accessibilité (27/10/2026)

Contrôle : `tests/e2e/accessibilite.e2e.spec.ts` (`@axe-core/playwright`, règles WCAG 2.1 A et AA) sur chaque écran du site (27 adresses), de l'espace membre (13) et du back-office (15 listes et 6 fiches d'édition), aux deux largeurs des captures (1440 et 390 px). Le test échoue à la moindre anomalie grave ou critique ; le détail de toutes les anomalies, toutes gravités, est écrit dans `test-results/accessibilite.json`. S'y ajoutent sept parcours au clavier : lien d'évitement et focus visible sur l'accueil, menu mobile (ouverture, fermeture par Échap), formulaire de contact, étape 1 de la candidature (erreurs portées par `aria-invalid`), connexion à l'espace membre et au back-office entièrement au clavier, coupure des animations par `prefers-reduced-motion` et par l'interrupteur du pied de page.

Premier passage : 47 anomalies graves ou critiques (2 sur le site, 2 dans l'espace membre, 43 dans le back-office, dont 39 dans des composants natifs de Payload). Corrections :
- Site : contraste du gris discret dans la carte « Expirées » des opportunités (sous l'opacité de la carte, 4,5:1 non atteint) ; le menu mobile se ferme avec Échap.
- Espace membre : lien « politique de confidentialité » du profil souligné (il ne se distinguait que par sa couleur).
- Back-office, nos écrans : boîte de réception des messages (rôles ARIA corrigés, pastille « Non lu » lisible par les lecteurs d'écran), tableau des droits défilant accessible au clavier, contour de focus sur les liens et champs (cartes du tableau de bord, recherche).
- Back-office, composants natifs de Payload : `src/components/admin/AccessibiliteNative.tsx`, fournisseur de l'admin qui complète les attributs manquants sans changer le rendu (nom des boutons-icônes « ⋮ », flèches de pagination, poignée de déplacement, boutons d'image et de date ; étiquette reliée aux listes déroulantes et au champ date ; onglets du document ; lien vide de l'aperçu SEO ; enveloppe cliquable autour du bouton « Ajouter » d'une relation). Contrastes des textes gris de Payload et des pastilles de longueur de l'extension SEO relevés dans `custom.scss`. Écart assumé : ces corrections s'appliquent juste après l'affichage de chaque écran ; à signaler à Payload pour une correction à la source.

Écart visuel assumé : dans la carte « Expirées » des opportunités, la date et la note passent du gris discret au gris foncé (contraste).

Résultat : dernier passage complet de `accessibilite.e2e.spec.ts`, 13 tests sur 14 réussis, dont les 7 parcours au clavier, et une seule anomalie grave restante sur les 124 analyses (62 écrans, deux largeurs) (zone de saisie de l'éditeur de texte riche sans nom, fiche d'actualité). Elle est corrigée (zone reliée à l'étiquette du champ), puis vérifiée par une nouvelle analyse des fiches d'actualité et de page aux deux largeurs : zéro anomalie grave ou critique. Sur ce poste, le serveur de développement est lent (connexion d'un membre en 17 s) : les délais d'attente du test sont de 3 minutes.

## Lot 12 : recette interne (27/10/2026)

Déroulé et résultats dans `docs/RECETTE-INTERNE.md`. Nouveau fichier `tests/int/recette.int.spec.ts` (13 tests) pour les points de `docs/12` sans test. Anomalies corrigées : délai de défense de 15 jours contournable par le corps de la requête (`src/collections/DisciplinaryCases.ts`, les dates et délais du dossier ne viennent plus que du serveur) ; boutons de discipline affichés au responsable membres alors que le serveur les lui refuse (question 10 de `docs/QUESTIONS.md`). Paiements joués en mode « simulation » (question 11).

## Lot 12 : guide du back-office (27/10/2026)

`docs/guide/guide-back-office.pdf` (36 pages A4), produit depuis `docs/guide/guide-back-office.html` par `node docs/guide/generer-pdf.cjs`. Partie commune, puis un chapitre par rôle (super administrateur, administrateur, responsable membres, trésorier, éditeur, responsable événements) avec droits, limites et tâches pas à pas, captures des données de démonstration. Aucun montant de cotisation n'y est écrit (décision en attente sur la catégorie B) : le guide renvoie à Paramètres, onglet Tarifs. Écarts relevés entre les documents et le code, le guide suivant le code : un éditeur publie lui-même les actualités (matrice de `docs/04`, alors que `docs/08` parle d'envoi en relecture) ; seul le super administrateur invite et gère les comptes ; l'enregistrement manuel d'un paiement propose espèces et virement.

## Correctif : images absentes hors du port 3000 (28/10/2026)

Payload écrivait les adresses des images de la médiathèque en adresses complètes, préfixées de `NEXT_PUBLIC_SERVER_URL` (`http://localhost:3000/api/media/file/…`). Servi à une autre adresse (prévisualisation sur le port 3100, ou préproduction mal réglée), le site n'affichait plus aucune photo. La médiathèque renvoie maintenant des chemins relatifs (`/api/media/file/…`, crochet `afterRead` de `src/collections/Media.ts`) ; les données structurées des actualités et des événements, qui exigent une adresse complète, préfixent elles-mêmes l'adresse du site. Vérifié sur la compilation de production servie au port 3100 : accueil 32 images, Le réseau 9, annuaire 6, agenda 5, actualités 6, opportunités 6, partenaires 8, aucune adresse absolue restante.

## Correctif : back-office en thème sombre (28/10/2026)

Sur un poste réglé en thème sombre, Payload passait l'administration en sombre (fond noir) alors que l'habillage de la maquette ne définit que le thème clair. Le back-office est désormais fixé en thème clair (`admin.theme: 'light'` dans `src/payload.config.ts`). Vérifié avec un navigateur en thème sombre : connexion et Cotisations sur fond sable, boutons lisibles.

## Mises en relation : échanges sur la plateforme (28/10/2026)

Décision de Webtinix : une mise en relation acceptée ne transmet plus de coordonnées ; les deux membres échangent par la messagerie de « Mes échanges », que le super administrateur, l'administrateur et le responsable membres peuvent lire.
- Serveur : `src/lib/echanges/actions.ts` (envoi réservé aux deux membres d'une relation acceptée, 60 messages par heure au plus, e-mail « nouveau message » au premier message non lu) ; fonction `coordonneesPartagees` supprimée.
- Espace membre : encart des coordonnées retiré ; textes adaptés (« Accepter la mise en relation », aide de l'onglet, mention que l'équipe peut lire ces échanges).
- Back-office : écran Demandes des membres, onglet Mises en relation, colonne « Conversation » qui se déplie (message de présentation et fil), visible des trois rôles autorisés seulement.
- E-mails : nouveau modèle 15 ter « Nouveau message d'un membre » (le contenu n'est pas recopié dans l'e-mail) ; texte de la demande reçue mis à jour en base s'il n'avait pas été personnalisé. Migration `20261028_170336_messagerie_membres` (liste des modèles).
- Documents modifiés : `docs/05-regles-metier.md` (§ mises en relation) et `docs/09-emails-et-notifications.md` (§ 15).
- Écart assumé avec la maquette : sous la zone d'écriture d'une mise en relation, « L'autre membre est prévenu par e-mail et WhatsApp, sans voir votre numéro » devient « L'autre membre est prévenu par e-mail. L'équipe de REC 242 peut lire ces échanges. » (aucun envoi WhatsApp n'est branché). Inchangé : sur les fiches de l'annuaire, un membre connecté voit toujours les coordonnées que chaque membre choisit d'afficher (`docs/05`, annuaire).

## Échanges sur la plateforme et abonnement « Annuaire détaillé » (28/10/2026)

Décisions de Webtinix, en complément de la section précédente : les membres ne doivent pas pouvoir se transmettre de coordonnées, les échanges restent sur la plateforme (un espace réseau de discussion et d'opportunités viendra ensuite) ; un abonnement payé en plus de la cotisation donne accès aux fiches détaillées de l'annuaire.
- **Masquage** (`src/lib/echanges/masquage.ts`) : numéros de téléphone (8 chiffres ou plus, avec ou sans séparateurs ni indicatif), adresses e-mail (y compris « nom (at) domaine (dot) cg ») et liens de messagerie (wa.me, chat.whatsapp.com, t.me…) remplacés par « [coordonnée masquée] » dans les premiers messages, les messages des conversations et les réponses aux annonces, à l'enregistrement puis à l'affichage (espace membre et back-office) pour les messages plus anciens. Dates et montants (« 10 000 000 FCFA ») ne sont pas touchés. Messages de REC 242 et des experts non concernés.
- **Écrire directement** : sur la fiche d'un membre, « Écrire à ce membre » remplace « Mise en relation » ; le premier message ouvre la conversation (statut « Acceptée »), une seule par paire de membres (un nouveau message s'ajoute à la conversation ouverte) ; plafond de 10 nouvelles conversations par semaine conservé ; e-mail « X vous a écrit » sans le contenu. Onglet « Conversations » dans Mes échanges, « Conversations entre membres » au back-office.
- **Annuaire** (`src/lib/annuaire/donnees.ts`) : les coordonnées ne sont plus lues ni affichées pour personne ; sans abonnement, un membre voit les mêmes informations que le visiteur et peut écrire ; avec l'abonnement, fiche détaillée (dirigeant, portrait, quartier, taille, commissions, liens). Contrôle fait côté serveur (`estAbonne`).
- **Abonnement** (`src/lib/abonnement/`) : prix et durée dans Paramètres, onglet Tarifs, groupe « Abonnement Annuaire détaillé », vides par défaut (l'offre n'est pas proposée tant qu'ils le sont) ; paiement MTN MoMo ou Airtel Money depuis l'annuaire de l'espace membre (même parcours que la cotisation), ou en espèces enregistré par le trésorier (objet « Abonnement Annuaire détaillé ») ; à la confirmation, `abonnementJusquau` du membre est prolongé de la durée enregistrée sur le paiement, à partir de la fin en cours ; reçu numéroté et journal comme tout paiement. Le membre ne peut pas modifier sa date d'abonnement.
- Textes de la maquette modifiés en conséquence (écarts assumés) : fiche publique (« Dirigeant, quartier et taille réservés aux membres abonnés à l'annuaire détaillé », carte « Prendre contact »), page Annuaire publique, annuaire et fiche de l'espace membre (plus de lignes Téléphone, WhatsApp, E-mail), Mes échanges, tableau de bord.
- Migrations `20261028_170336_messagerie_membres` et `20261028_183711_abonnement_annuaire` ; `docs/05` (§ annuaire et § échanges) modifié.
- Tests : `tests/int/abonnement.int.spec.ts` (masquage, offre vide, prolongation, le membre ne s'attribue pas l'abonnement), `annuaire.int` et `recette.int` adaptés, E2E `lot7-annuaire` adapté.
- À mettre à jour ensuite : le guide du back-office (`docs/guide/`) et les captures de l'annuaire de l'espace membre (écrans 07 et 08).
