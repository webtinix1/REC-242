# Recette

Scénarios à dérouler avant la livraison, d'abord par les tests automatiques (Playwright), puis à la main par Webtinix et par REC 242 en préproduction. Chaque scénario est joué sur ordinateur et sur un téléphone Android d'entrée de gamme en 4G.

## Parcours principaux

1. **Candidature en ligne** : un visiteur choisit la catégorie B sur Adhérer, remplit les cinq étapes, paie la première tranche en test MTN MoMo. Attendu : page merci avec numéro, e-mail récapitulatif, reçu PAY-…, alerte à l'adresse des paramètres, pastille au back-office.
2. **Doublon** : même e-mail, puis même téléphone écrit autrement (06… au lieu de +242 06…). Attendu : blocage à l'étape 1 avec le message exact.
3. **Quatrième secteur** : refusé avec le message prévu.
4. **Traitement** : le responsable membres ouvre le dossier, demande un complément, passe en « Acceptée », coche pièce et charte, convertit. Attendu : membre créé, e-mail de bienvenue, lien d'activation valable 72 h, historique et journal à jour.
5. **Refus** : motif obligatoire, e-mail envoyé, paiement en « remboursement à traiter ».
6. **Activation et connexion** : le membre crée son mot de passe, se connecte, voit sa carte valable jusqu'à la veille de sa date anniversaire.
7. **Profil** : modifier la présentation (relecture), demander un changement de téléphone (valeur actuelle conservée jusqu'à validation), masquer son e-mail, retirer sa fiche de l'annuaire.
8. **Annuaire** : en visiteur, aucune coordonnée dans le code source de `/membres` et des fiches ; en membre, coordonnées selon les choix de chacun.
9. **Mise en relation** : demande, acceptation, coordonnées partagées ; refus sans motif ; onzième demande de la semaine bloquée.
10. **Événement** : capacité 2 ; deux inscriptions, la troisième en liste d'attente ; annulation de la première, promotion automatique et e-mail ; rappel la veille ; scan du billet et de la carte le jour J, y compris en mode avion puis synchronisation.
11. **Opportunité de membre** : publication, modération (demande de modification, puis publication), réponse d'un autre membre, expiration le lendemain de la date limite.
12. **Expert** : question, transmission, pas de réponse pendant 5 jours ouvrés (horloge simulée), passage en « Sans réponse », relance, réattribution, réponse, clôture.
13. **Commission** : demande pour rejoindre, acceptation, apparition dans le profil.
14. **Cotisation** : paiement de la deuxième tranche depuis l'espace membre ; paiement en espèces enregistré par le trésorier ; reçus numérotés sans trou.
15. **Relances** : première relance, tentative de deuxième relance avant 15 jours refusée, troisième relance, constat de perte avec date du comité et procès-verbal ; le membre devient ancien membre et quitte l'annuaire.
16. **Discipline** : ouverture, notification des griefs, tentative de décision avant J+15 refusée, avis de la commission, décision de suspension de 2 mois, accès coupé, levée automatique à la fin.
17. **Message du site** : motif Presse, transmis à l'éditeur, réponse par e-mail, statut « Traité ».
18. **Contenus** : un éditeur rédige une actualité réservée aux membres, ne peut pas la publier ; un administrateur la programme ; à l'heure dite elle paraît, le visiteur ne voit que le chapeau.
19. **Paramètres** : changer le lien du groupe WhatsApp (journalisé), vider un chiffre clé (il disparaît du site), modifier un tarif (les échéances déjà émises ne changent pas).
20. **Droits** : pour chacun des six rôles, vérifier par l'interface et par l'API REST que les accès correspondent à la matrice.

## Sécurité

- Cinq mots de passe faux : blocage 15 minutes, message affiché, entrée au journal.
- Connexion d'un administrateur depuis un nouveau navigateur : e-mail d'alerte.
- Inactivité de 30 minutes : déconnexion.
- Accès direct à un document réservé sans session : refusé.
- Un membre tente de lire `/api/members/[id]` d'un autre membre : refusé.
- Formulaires : injection de HTML et de script neutralisée, limitation de débit active.

## Qualité

- Lighthouse mobile ≥ 90 (performance, accessibilité, bonnes pratiques, SEO) sur accueil, adhérer, annuaire, agenda, fiche événement.
- Axe : zéro erreur critique sur tous les écrans.
- Navigation complète au clavier sur la candidature et l'espace membre.
- `prefers-reduced-motion` et l'interrupteur d'animations coupent toutes les animations.
- Comparaison visuelle avec `captures/` : aucun écart non justifié dans `docs/AVANCEMENT.md`.
- E-mails : rendu vérifié dans Gmail (web et Android) et Outlook.

## Validation

La recette est validée par écrit par REC 242 après le déroulé en préproduction. Les anomalies sont classées bloquante, majeure ou mineure ; la mise en production attend la correction de toutes les bloquantes et majeures.
