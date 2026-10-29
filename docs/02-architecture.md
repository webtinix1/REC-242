# Architecture

## Vue d'ensemble

Une seule application Next.js (App Router) qui embarque Payload 3. Trois groupes de routes :

```
app/
  (site)/              site public            /  /adherer  /membres  /agenda …
  (espace-membre)/     espace membre          /espace-membre/…
  (payload)/admin/     back-office Payload    /admin/…
  api/                 routes propres : paiements (rappels des opérateurs), téléchargements protégés
payload.config.ts
collections/  globals/  hooks/  access/  jobs/  components/admin/  emails/
```

- Base de données : PostgreSQL (`@payloadcms/db-postgres`), migrations versionnées.
- Fichiers : stockage local sur le VPS au départ, adaptateur S3 compatible prêt à brancher (`@payloadcms/storage-s3`). Les images sont redimensionnées et converties en WebP à l'import (`sharp`). Les documents réservés ne sont jamais servis en accès direct : ils passent par une route qui vérifie les droits.
- E-mails : adaptateur Nodemailer (SMTP de contact@rec242.cg). Gabarits dans `emails/`, textes modifiables dans le back-office (voir `09-emails-et-notifications.md`).
- Tâches programmées : file de tâches de Payload (jobs) pour l'expiration des opportunités, les rappels d'événements, les relances de cotisation et les alertes « sans réponse ».
- Recherche : `@payloadcms/plugin-search` sur pages, actualités, événements et fiches publiques des membres. Référencement : `@payloadcms/plugin-seo`. Redirections : `@payloadcms/plugin-redirects`.
- Pages et actualités : brouillons, versions, publication programmée et prévisualisation (versions et drafts de Payload, aperçu en direct).

## Authentification : deux collections séparées

| Collection | Qui | Où | Règles |
|---|---|---|---|
| `users` | Équipe REC 242 et Webtinix | `/admin` | Mot de passe de 12 caractères minimum, blocage 15 min après 5 essais (`maxLoginAttempts`, `lockTime`), session de 30 min d'inactivité, alerte e-mail à la connexion depuis un nouvel appareil, journal de toutes les connexions. Rôles : voir `04-roles-et-droits.md`. |
| `members` | Membres de REC 242 | `/espace-membre` | Compte créé par le back-office quand une candidature est acceptée. Le membre choisit son mot de passe (10 caractères minimum) avec un lien unique valable 72 h. Session de 30 min d'inactivité, ou 30 jours si « Rester connecté » est coché. Connexion par lien e-mail possible. |

Payload chiffre les mots de passe en PBKDF2 avec sel. Le cahier des charges client demande « un algorithme robuste, type bcrypt » : PBKDF2 répond à l'exigence ; si REC 242 tient à bcrypt, prévoir une stratégie d'authentification personnalisée. Protection CSRF (`csrf` de Payload, cookies `SameSite=Lax`), protection XSS (pas de HTML brut non nettoyé, en-têtes de sécurité). Les formulaires publics (contact, candidature, partenariat, inscription) sont limités en débit (10 envois par heure et par appareil pour le contrôle de doublon).

Prévoir dans `users` un champ `twoFactor` vide : la double authentification viendra dans une version suivante.

## Le back-office dans l'admin Payload

- Menu de gauche réorganisé comme la maquette : Pilotage, Adhésions, Activité, Contenus, Administration. Libellés en français, pastilles rouges des éléments en attente.
- Tableau de bord personnalisé à la place du tableau de bord par défaut.
- Vues personnalisées (`admin.components.views`) pour les écrans orientés tâches. Elles utilisent l'API locale et respectent les mêmes fonctions d'accès que les collections.
- Vues natives pour les contenus, avec composants de champ personnalisés quand la maquette le demande.
- Habillage : logo, couleurs et typographie de REC 242 (variables de `design/tokens.css`). Le cadre de l'admin Payload ne sera pas identique au pixel près à la maquette ; l'intérieur des vues personnalisées, oui.
- Tableau de répartition écran par écran : `08-ecrans-back-office.md`.

## Paiements

- Opérateurs : MTN MoMo (API Collection, « request to pay ») et Airtel Money (API Collection). Commencer en environnement de test (« sandbox ») ; les comptes marchands sont à obtenir par REC 242.
- Déroulé : le membre saisit son numéro, le serveur crée un `payment` au statut « en attente », appelle l'opérateur, le membre valide sur son téléphone, l'opérateur rappelle la route `api/paiements/[operateur]`. À la confirmation : statut « payé », reçu PDF numéroté (PAY-0001, PAY-0002…), e-mail au membre, échéancier mis à jour.
- Paiement au siège ou par virement : enregistré par le trésorier dans le back-office, même reçu.
- Montants et échéances : `05-regles-metier.md`.

## WhatsApp

- Version 1 : liens `wa.me` avec message prérempli, lien de la chaîne publique, lien du groupe des membres (stockés dans les paramètres, modifiables).
- Les notifications WhatsApp de la maquette (rappels, relances) demandent l'API WhatsApp Business de Meta et un numéro vérifié. Tant que ce n'est pas disponible, ces notifications partent par e-mail ; prévoir un canal d'envoi interchangeable.

## Animations

Le site public utilise un petit moteur d'animation au défilement (`design/rec-motion.js`, attributs `data-m…`) et les règles de `design/animations.css`. Il respecte `prefers-reduced-motion` et un interrupteur « Activer les animations » en pied de page. Les espaces membre et back-office n'ont pas d'animation.

## Déploiement

VPS Linux, Node LTS, PostgreSQL, Nginx en frontal, certificat TLS, sauvegarde quotidienne de la base et des fichiers (rétention 30 jours), environnement de préproduction séparé. Variables d'environnement documentées dans `.env.example`.

Nginx doit transmettre l'adresse réelle du visiteur : les limites d'envoi (connexion, mot de passe oublié, formulaires, paiements) lisent `X-Real-IP`, sinon le dernier élément de `X-Forwarded-For`.

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Next ne doit écouter que sur l'interface locale (`127.0.0.1`), derrière Nginx.

## Budget de performance (pages publiques)

LCP inférieur à 2,5 s en 4G simulée, CLS inférieur à 0,1, moins de 150 Ko de JavaScript compressé par page publique, Lighthouse mobile 90 ou plus en performance, accessibilité, bonnes pratiques et SEO.
