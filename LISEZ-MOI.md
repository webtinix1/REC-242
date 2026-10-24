# Dossier de développement REC 242

Ce dossier contient tout ce qu'il faut pour développer la plateforme de REC 242 avec Claude Code : la maquette validée par le client, les règles, le modèle de données et le plan de travail.

## Contenu

| Dossier | Contenu |
|---|---|
| `CLAUDE.md` | Les consignes que Claude Code lit à chaque session. |
| `docs/` | Le cahier technique : projet, architecture, données, droits, règles, écrans, e-mails, plan, recette. |
| `maquette/` | La maquette interactive. Ouvrir `maquette/index.html` dans un navigateur, sans serveur. |
| `captures/` | Chaque écran en image, ordinateur (1440 px) et mobile (390 px) : 126 fichiers. |
| `design/` | Variables, feuilles de styles, animations, polices, images, logos. |
| `seed/` | Les données de démonstration de la maquette, en JSON. |
| `sources/` | Cahier des charges du client, réponses de REC 242, statuts, règlement, charte, fiche d'adhésion, logo, cahier des charges Webtinix. |

## Démarrer

1. Créer un dépôt Git vide et y copier le contenu de ce dossier (garder `maquette/`, `captures/`, `design/`, `seed/` et `sources/` à la racine, ou les ranger dans `reference/` en adaptant les chemins de `CLAUDE.md`).
2. Ouvrir le dépôt dans Claude Code.
3. Premier message conseillé :

   > Lis CLAUDE.md puis les documents 01, 02 et 10 de docs/. Résume en dix lignes ce que tu as compris du projet et propose ton plan détaillé pour le lot 0. Ne code pas encore.

4. Après validation du plan : « Réalise le lot 0. » Puis un lot à la fois, en relisant `docs/AVANCEMENT.md` et `docs/QUESTIONS.md` à la fin de chaque lot.

## Conseils

- Un lot par session quand c'est possible ; en début de session, demander de relire `docs/AVANCEMENT.md`.
- Répondre aux questions de `docs/QUESTIONS.md` directement dans le fichier.
- Pour un écran, citer sa capture : « Compare /adherer à captures/site/09-adherer-mobile.webp ».
- Les éléments à obtenir du client sont dans `docs/11-a-obtenir-de-rec242.md` : à lancer dès maintenant, notamment les comptes marchands Mobile Money et l'accès SMTP.

Webtinix · contact@webtinix.com
