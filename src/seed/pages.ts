/**
 * Pages institutionnelles : textes de la maquette (maquette/sources/B-Site.dc.html), rangés par section.
 * Chaque bloc porte une « ancre » que le gabarit de la page utilise pour le placer.
 * Une page existante dont le contenu est vide est complétée ; une page déjà rédigée n'est pas touchée.
 */
import type { Payload } from 'payload'

import { slugify } from '@/fields/slug'
import { media, readSeed } from './lib'

type Bouton = { libelle: string; lien: string }
type Carte = { titre: string; texte?: string; lien?: string; libelleLien?: string; image?: number }

const S = (
  ancre: string,
  d: {
    surtitre?: string
    titre?: string
    texte?: string
    image?: number
    boutons?: Bouton[]
    note?: string
    aValider?: boolean
  },
) => ({ blockType: 'section', ancre, ...d })

const C = (
  ancre: string,
  d: {
    surtitre?: string
    titre?: string
    intro?: string
    style?: string
    reference?: string
    boutons?: Bouton[]
    note?: string
    aValider?: boolean
    cartes: Carte[]
  },
) => ({ blockType: 'cartes', ancre, ...d })

const B = (libelle: string, lien: string): Bouton => ({ libelle, lien })

const WHATSAPP = 'https://wa.me/242067257950'

const PILIERS: Carte[] = [
  {
    titre: 'Se connecter',
    texte:
      'Mises en relation B2B entre entrepreneurs, commerçants et entreprises, et rencontres avec investisseurs et clients.',
  },
  {
    titre: 'Entreprendre',
    texte:
      'Accompagnement des entreprenants du secteur informel et des porteurs de projets vers la formalisation.',
  },
  {
    titre: 'Construire',
    texte: 'Entraide, formation, mentorat et partage d’opportunités, au service du Made in Congo.',
  },
]

const ORGANES: Carte[] = [
  {
    titre: 'Assemblée générale',
    texte:
      'Organe suprême. Définit les orientations, élit les organes dirigeants et les contrôleurs aux comptes. Se réunit une fois par an.',
  },
  {
    titre: 'Comité de direction',
    texte:
      'La fondatrice et sept membres répartis en cinq pôles. Exécute les décisions, valide les adhésions, se réunit au moins une fois par mois.',
  },
  {
    titre: 'Commissions thématiques',
    texte:
      'Organes consultatifs créés par le comité de direction. Elles donnent des avis et proposent.',
  },
  {
    titre: 'Contrôleurs aux comptes',
    texte:
      'Deux membres élus, hors comité. Vérifient les comptes et présentent un rapport à l’assemblée.',
  },
]

const AVANTAGES: Carte[] = [
  {
    titre: 'Rencontrer des clients et des partenaires',
    texte: 'Rencontres B2B, afterworks et salons entre membres.',
    lien: '/agenda',
    libelleLien: 'Voir l’agenda',
  },
  {
    titre: 'Être visible dans l’annuaire',
    texte: 'Une fiche pour votre activité, consultable par les membres et le public.',
    lien: '/membres',
    libelleLien: 'Voir l’annuaire',
  },
  {
    titre: 'Accéder aux opportunités B2B',
    texte: 'Appels à partenariat, appels d’offres relayés, financements.',
    lien: '/opportunites',
    libelleLien: 'Voir les opportunités',
  },
  {
    titre: 'Sortir de l’informel',
    texte: 'Orientation vers les administrations, ateliers et mentorat.',
    lien: '/formalisation',
    libelleLien: 'Voir l’accompagnement',
  },
  {
    titre: 'Se former',
    texte: 'Ateliers, formations et masterclass du réseau.',
    lien: '/agenda',
    libelleLien: 'Voir les ateliers',
  },
  {
    titre: 'Compter sur l’entraide',
    texte: 'Une assistance morale et technique entre membres.',
    lien: '/le-reseau',
    libelleLien: 'Nos valeurs',
  },
]

const legal = (cartes: [string, string][]) =>
  C('rubriques', { style: 'legal', cartes: cartes.map(([titre, texte]) => ({ titre, texte })) })

const liensLegaux = (liens: [string, string][]) =>
  C('liens', { cartes: liens.map(([titre, lien]) => ({ titre, lien })) })

export async function seedPages(payload: Payload): Promise<void> {
  const img = (f: string, alt: string, focal?: [number, number]) =>
    media(payload, `design/images/${f}`, alt, true, focal)

  const g = readSeed<{
    antennes_back_office: { v: string; ref: string; tel: string; st: string }[]
    antennes: { v: string; d: string }[]
  }>('gouvernance')
  const adhesion = readSeed<{
    avec_ou_sans: { t: string; sans: boolean; avec: boolean }[]
    statuts_de_membre: { nom: string; pour: string; droits: string }[]
    parcours: { t: string; d: string }[]
  }>('adhesion')
  const temoignages = await payload.find({
    collection: 'testimonials',
    limit: 10,
    depth: 0,
    sort: 'createdAt',
    overrideAccess: true,
  })
  const STATUT: Record<string, string> = {
    Active: 'active',
    'En création': 'creation',
    'En projet': 'projet',
  }
  const antennes = g.antennes_back_office.map((x, i) => ({
    ville: x.v.replace(' (siège)', ''),
    statut: i === 0 ? 'siege' : (STATUT[x.st] ?? 'projet'),
    adresse: g.antennes[i]?.d,
    referent: x.ref === 'Référent à désigner' ? '' : x.ref,
    contact: x.tel,
  }))

  const list: { title: string; chemin: string; menu?: string; layout: unknown[] }[] = [
    {
      title: 'Accueil',
      chemin: '/',
      layout: [
        S('hero', {
          surtitre: 'Réseau des Entrepreneurs Congolais',
          titre: 'Entreprendre au Congo, sans rester seul.',
          texte:
            'REC 242 réunit entreprenants de l’informel, commerçants et entreprises pour s’entraider, se rencontrer et faire des affaires ensemble.',
          image: await img(
            'photos/entrepreneuses-rencontre.webp',
            'Entrepreneuses réunies lors d’une rencontre du réseau',
            [85, 30],
          ),
          boutons: [B('Rejoindre REC 242', '/adherer'), B('Découvrir le réseau', '/le-reseau')],
          note: 'Se connecter. Entreprendre. Construire.',
        }),
        C('piliers', {
          surtitre: 'Qui est REC 242',
          titre: 'Trois verbes pour avancer ensemble',
          boutons: [B('Notre gouvernance', '/le-reseau/gouvernance')],
          cartes: PILIERS,
        }),
        C('avantages', {
          surtitre: 'Pourquoi adhérer',
          titre: 'Ce que le réseau vous apporte',
          boutons: [B('Voir les conditions d’adhésion', '/adherer')],
          cartes: AVANTAGES,
        }),
        S('agenda', {
          surtitre: 'Agenda',
          titre: 'On se retrouve bientôt',
          image: await img(
            'photos/groupe.webp',
            'Membres du réseau échangeant lors d’une rencontre',
            [50, 30], // .v-groupe de la maquette
          ),
          boutons: [B('Tout l’agenda', '/agenda')],
        }),
        C('visages', {
          surtitre: 'Le réseau en visages',
          titre: 'Des membres de tous horizons',
          intro: 'Seuls les membres qui ont accepté d’être mis en avant apparaissent ici.',
          boutons: [B('Explorer l’annuaire', '/membres')],
          cartes: [
            {
              titre: 'Commerçant devant sa boutique',
              image: await img(
                'photos/commercant-boutique.webp',
                'Commerçant devant sa boutique',
                [75, 30],
              ),
            },
            {
              titre: 'Couturier au travail dans son atelier',
              image: await img(
                'photos/couturier-atelier.webp',
                'Couturier au travail dans son atelier',
                [50, 30],
              ),
            },
            {
              titre: 'Séance de travail en petit groupe',
              image: await img(
                'photos/seance-travail.webp',
                'Séance de travail en petit groupe',
                [50, 55],
              ),
            },
          ],
        }),
        S('formalisation', {
          surtitre: 'Formalisation',
          titre: 'Sortir de l’informel, accompagné',
          texte:
            'Orientation vers les administrations, ateliers et mentorat : la commission Formalisation accompagne les entreprenants et les porteurs de projets.',
          image: await img(
            'photos/commercante-etal.webp',
            'Commerçante devant son étal de fruits',
            [70, 35],
          ),
          boutons: [B('Découvrir l’accompagnement', '/formalisation')],
        }),
        S('opportunites', {
          surtitre: 'Opportunités',
          titre: 'Opportunités ouvertes à tous',
          boutons: [B('Toutes les opportunités', '/opportunites')],
        }),
        S('actualites', {
          surtitre: 'Actualités',
          titre: 'La vie du réseau',
          boutons: [B('Toutes les actualités', '/actualites')],
        }),
        S('partenaires', {
          surtitre: 'Écosystème',
          titre: 'Nos partenaires',
          boutons: [B('Devenir partenaire', '/devenir-partenaire')],
        }),
        S('faq', {
          surtitre: 'Questions fréquentes',
          titre: 'Avant d’adhérer',
          boutons: [B('Toutes les questions', '/adherer')],
        }),
        S('final', {
          titre: 'Vous dirigez une entreprise ou portez un projet au Congo ?',
          texte:
            'Rejoignez un réseau d’entrepreneurs qui s’entraident. Une question ? L’équipe répond sur WhatsApp au +242 06 725 79 50.',
          boutons: [B('Adhérer', '/adherer/candidature'), B('Nous écrire sur WhatsApp', WHATSAPP)],
        }),
      ],
    },
    {
      title: 'Le réseau',
      chemin: '/le-reseau',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Qui sommes-nous',
          titre: 'Un écosystème où les entrepreneurs ne restent plus isolés.',
          texte:
            'Notre vision : construire une communauté entrepreneuriale nationale de référence.',
          image: await img(
            'photos/brazzaville-fleuve.webp',
            'Brazzaville et le fleuve Congo vus depuis un pont',
            [60, 50],
          ),
          boutons: [B('Adhérer', '/adherer'), B('Voir la gouvernance', '/le-reseau/gouvernance')],
          note: 'Brazzaville et le fleuve Congo',
        }),
        S('histoire', {
          surtitre: 'Notre histoire',
          titre: 'Une association née à Brazzaville le 3 octobre 2026',
          texte:
            'L’assemblée générale constitutive a adopté les statuts et le règlement intérieur. REC 242 est une association à but non lucratif, apolitique et non confessionnelle, régie par la loi du 1er juillet 1901.',
        }),
        S('but', {
          surtitre: 'Notre but',
          texte:
            'Structurer, connecter et valoriser l’écosystème entrepreneurial congolais en facilitant l’entraide et les affaires entre ses membres.',
          note: 'Article 7 des statuts',
        }),
        C('mission', { surtitre: 'Notre mission', titre: 'Trois piliers', cartes: PILIERS }),
        C('objectifs', {
          surtitre: 'Nos objectifs',
          titre: 'Cinq engagements',
          style: 'liste',
          reference: 'Article 8 des statuts',
          cartes: [
            'Faciliter la mise en relation d’affaires B2B entre entrepreneurs formalisés, commerçants, entreprises et sociétés.',
            'Accompagner les entreprenants du secteur informel et les porteurs de projets vers la formalisation.',
            'Faire rencontrer les porteurs de projets avec les investisseurs, les clients et les entreprises.',
            'Créer un écosystème d’entraide, de formation, de mentorat et de partage d’opportunités.',
            'Promouvoir le Made in Congo et l’éthique des affaires.',
          ].map((titre) => ({ titre })),
        }),
        C('organisation', {
          surtitre: 'Organisation',
          titre: 'Quatre niveaux d’organisation',
          cartes: ORGANES,
        }),
        S('comite', {
          surtitre: 'Gouvernance',
          titre: 'Le comité de direction',
          boutons: [B('Voir la gouvernance', '/le-reseau/gouvernance')],
        }),
        C('valeurs', {
          surtitre: 'Nos valeurs',
          titre: 'Ce qui nous tient ensemble',
          cartes: [
            {
              titre: 'Éthique des affaires',
              texte:
                'Pas d’escroquerie, pas d’activité pyramidale, des engagements clairs entre membres.',
            },
            {
              titre: 'Entraide',
              texte: 'Une assistance morale et technique entre membres, fondée sur le volontariat.',
            },
            {
              titre: 'Indépendance',
              texte: 'Une association apolitique et non confessionnelle, à but non lucratif.',
            },
          ],
        }),
        C('moyens', {
          surtitre: 'Comment nous agissons',
          titre: 'Nos moyens d’action',
          style: 'pastilles',
          reference: 'Article 9 des statuts',
          cartes: [
            'Rencontres B2B',
            'Ateliers',
            'Salons',
            'Formations',
            'Mentorat',
            'Plateforme d’entraide',
            'Orientation vers les administrations',
            'Partenariats techniques et financiers',
          ].map((titre) => ({ titre })),
        }),
        S('chiffres', {
          surtitre: 'En chiffres',
          titre: 'Chiffres clés',
          note: 'Un chiffre non renseigné est masqué sur le site tant qu’il n’est pas fourni par le comité de direction.',
        }),
        S('statuts', {
          titre: 'Statuts de l’association',
          texte: 'PDF · adoptés le 3 octobre 2026',
          boutons: [B('Télécharger les statuts', 'document:Statuts de l’association')],
        }),
      ],
    },
    {
      title: 'Gouvernance',
      chemin: '/le-reseau/gouvernance',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Gouvernance',
          titre: 'Les femmes et les hommes qui font vivre le réseau',
          texte:
            'Un comité de direction réuni autour de sa fondatrice, des commissions ouvertes aux membres, des comptes contrôlés.',
        }),
        S('comite', { titre: 'Le comité de direction' }),
        S('contact', {
          titre: 'Nous contacter',
          texte: 'Le comité répond via le secrétariat.',
          boutons: [B('Contacter le réseau', '/contact')],
        }),
        S('experts', {
          surtitre: 'Expertise',
          titre: 'Experts et référents par domaine',
          texte:
            'Chaque membre du comité et chaque expert du réseau porte des étiquettes d’expertise. Un membre qui a une question sur son secteur est orienté vers les bonnes personnes.',
          boutons: [B('Solliciter un expert', '/espace-membre/experts')],
          note: 'Les experts sont des membres de la catégorie Expert, admis par le comité de direction. Les étiquettes sont gérées depuis le back-office et reprennent la liste des secteurs du réseau.',
        }),
        S('citation', {
          surtitre: 'Comité de direction',
          texte:
            'La fondatrice et sept membres répartis en cinq pôles. Exécute les décisions, valide les adhésions, se réunit au moins une fois par mois.',
          image: await img(
            'photos/reunion-table.webp',
            'Réunion de travail autour d’une table',
            [50, 45],
          ),
        }),
        S('organigramme', {
          titre: 'Organigramme',
          note: 'Deux contrôleurs aux comptes, élus par l’assemblée générale, hors comité.',
        }),
        C('organes', { titre: 'Comment le réseau est organisé', cartes: ORGANES }),
        S('textes', { titre: 'Nos textes' }),
      ],
    },
    {
      title: 'Commissions',
      chemin: '/le-reseau/commissions',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Commissions',
          titre: 'Cinq commissions, une expertise partagée',
          texte:
            'Organes consultatifs créés par le comité de direction, les commissions donnent des avis et font des propositions. Les membres actifs peuvent rejoindre celles qui sont ouvertes.',
        }),
        S('designation', {
          surtitre: 'Éthique et Vérification',
          texte:
            'La commission Éthique et Vérification n’est pas ouverte aux candidatures : ses membres sont désignés par le comité de direction.',
          image: await img('photos/seance-travail.webp', 'Séance de travail en petit groupe'),
        }),
      ],
    },
    {
      title: 'Antennes',
      chemin: '/le-reseau/antennes',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Antennes',
          titre: 'Un réseau présent dans tout le pays',
          texte:
            'Le siège est à Brazzaville. Chaque antenne a un référent, désigné par le comité de direction.',
        }),
        { blockType: 'antennes', ancre: 'antennes', antennes },
        S('siege', {
          surtitre: 'Siège',
          titre: 'Brazzaville · 165 rue Charles Foucault, Centre-Ville',
          image: await img('photos/brazza1.webp', 'Vue de Brazzaville, ville du siège'),
          boutons: [B('Contacter le réseau', '/contact')],
        }),
      ],
    },
    {
      title: 'Notre écosystème',
      chemin: '/le-reseau/ecosysteme',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Notre écosystème',
          titre: 'La place de REC 242 dans l’écosystème entrepreneurial',
          texte:
            'REC 242 se situe entre les entrepreneurs et ceux qui peuvent les aider à grandir.',
          note: 'Texte à valider par REC 242',
        }),
        S('cercle', {
          surtitre: 'Le cercle',
          titre:
            'REC 242 se situe entre les entrepreneurs et ceux qui peuvent les aider à grandir.',
          texte:
            'Les liens institutionnels effectifs seront nommés ici une fois confirmés. Aucune institution n’est citée sans accord.',
        }),
        C('familles', {
          cartes: [
            {
              titre: 'Les entrepreneurs',
              texte:
                'Entreprenants de l’informel, porteurs de projets, commerçants, entreprises : les membres du réseau.',
            },
            {
              titre: 'Les administrations',
              texte: 'Vers lesquelles le réseau oriente ses membres pour leurs démarches.',
            },
            {
              titre: 'Les partenaires techniques et financiers',
              texte: 'Qui soutiennent la formation, l’accompagnement et les rencontres.',
            },
            {
              titre: 'Les organisations professionnelles',
              texte: 'Avec lesquelles REC 242 pourra coopérer.',
            },
          ],
        }),
        S('final', {
          titre: 'Vous soutenez les entrepreneurs ?',
          texte: 'Construisons un partenariat au service des membres.',
          boutons: [B('Devenir partenaire', '/devenir-partenaire')],
        }),
      ],
    },
    {
      title: 'Partenaires',
      chemin: '/le-reseau/partenaires',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Partenaires',
          titre: 'Ils soutiennent les entrepreneurs du réseau',
          texte:
            'Les statuts prévoient des partenariats techniques et financiers au service des membres.',
          image: await img(
            'photos/couturier-atelier.webp',
            'Couturier au travail dans son atelier',
          ),
          note: 'Chaque logo renvoie vers le site du partenaire.',
        }),
        C('soutenir', {
          cartes: [
            { titre: 'Soutenir une rencontre', texte: 'Rencontre B2B, salon ou atelier.' },
            {
              titre: 'Former les membres',
              texte: 'Apporter une expertise aux entrepreneurs et porteurs de projets.',
            },
            {
              titre: 'Faciliter la formalisation',
              texte: 'Simplifier l’accès aux démarches et aux services.',
            },
          ],
        }),
        S('final', {
          titre: 'Devenir partenaire',
          texte:
            'La commission Partenariats prépare les conventions. Les conditions de la qualité de Partenaire seront communiquées par le comité de direction.',
          boutons: [B('Proposer un partenariat', '/devenir-partenaire')],
        }),
      ],
    },
    {
      title: 'Formalisation',
      chemin: '/formalisation',
      menu: 'Le réseau',
      layout: [
        S('hero', {
          surtitre: 'Formalisation',
          titre: 'Sortir de l’informel, accompagné.',
          texte:
            'REC 242 accompagne les entreprenants du secteur informel et les porteurs de projets vers la formalisation.',
          image: await img('photos/commercante-etal.webp', 'Commerçante devant son étal'),
          boutons: [B('En parler avec la commission', '/contact?motif=Autre&objet=Formalisation')],
        }),
        C('pourqui', {
          titre: 'C’est pour vous si…',
          cartes: [
            {
              titre: 'Vous travaillez sans être enregistré',
              texte: 'Votre activité tourne, mais n’a pas encore d’existence légale.',
              image: await img('photos/tricycle.webp', 'Transporteur au volant de son tricycle'),
            },
            {
              titre: 'Votre projet est prêt à démarrer',
              texte: 'Vous voulez partir sur de bonnes bases dès le premier jour.',
              image: await img(
                'photos/ordinateur.webp',
                'Porteuse de projet travaillant sur son ordinateur',
              ),
            },
            {
              titre: 'Vous êtes en catégorie A',
              texte: 'L’accompagnement fait partie de ce que le réseau vous apporte.',
              image: await img('photos/agriculteur.webp', 'Agriculteur dans son champ'),
            },
          ],
        }),
        C('offre', {
          titre: 'Ce que le réseau propose',
          note: 'Le détail sera fixé par la commission Formalisation.',
          aValider: true,
          cartes: [
            {
              titre: 'Orientation',
              texte: 'Vers les bonnes administrations, avec les bons documents.',
            },
            {
              titre: 'Ateliers et formations',
              texte: 'Des séances collectives sur les démarches et la gestion.',
            },
            { titre: 'Mentorat', texte: 'Un membre expérimenté suit vos progrès.' },
          ],
        }),
        S('atelier', {
          surtitre: 'Prochain atelier',
          boutons: [
            B('Voir l’atelier', '/agenda'),
            B('Adhérer en catégorie A', '/adherer/candidature?categorie=A'),
          ],
        }),
      ],
    },
    {
      title: 'Adhérer',
      chemin: '/adherer',
      menu: 'Adhérer',
      layout: [
        S('hero', {
          surtitre: 'Adhérer',
          titre: 'Rejoignez le cercle.',
          texte:
            'Un dossier en ligne, un paiement en une ou deux fois, une rencontre avec le comité de direction. Chaque candidature est examinée par le comité de direction.',
          image: await img(
            'photos/commercant-boutique.webp',
            'Commerçant devant sa boutique',
            [70, 30],
          ),
          boutons: [
            B('Commencer ma candidature', '/adherer/candidature'),
            B('Bulletin d’adhésion PDF', 'document:Bulletin d’adhésion'),
          ],
          // Délai proposé par Webtinix, à confirmer par REC 242 (docs/11-a-obtenir-de-rec242.md).
          note: 'Délai habituel de réponse : 10 jours ouvrés.',
        }),
        C('avantages', {
          surtitre: 'Avantages',
          titre: 'Six bonnes raisons d’adhérer',
          cartes: AVANTAGES,
        }),
        S('qui', {
          surtitre: 'Qui peut adhérer ?',
          texte:
            'Toute personne physique majeure ou morale qui exerce une activité économique légale ou porte un projet sérieux, partage les valeurs du réseau et accepte les statuts et le règlement intérieur.',
        }),
        {
          blockType: 'comparatif',
          ancre: 'comparatif',
          titre: 'Avec ou sans adhésion',
          lignes: adhesion.avec_ou_sans.map((l) => ({
            libelle: l.t,
            visiteur: l.sans,
            membre: l.avec,
          })),
        },
        S('categories', { surtitre: 'Catégories et cotisations', titre: 'Choisissez la vôtre' }),
        {
          blockType: 'statutsMembres',
          ancre: 'statuts',
          titre: 'Les statuts de membre',
          lignes: adhesion.statuts_de_membre.map((l, i) => ({
            nom: l.nom,
            categorie: ['A', 'B', 'C', 'expert', 'partenaire', 'honneur'][i],
            pour: l.pour,
            droits: l.droits,
          })),
        },
        C('parcours', {
          surtitre: 'Le parcours',
          titre: 'Cinq étapes pour devenir membre',
          style: 'numerotees',
          cartes: adhesion.parcours.map((p) => ({ titre: p.t, texte: p.d })),
        }),
        {
          blockType: 'temoignages',
          ancre: 'temoignages',
          titre: 'Ils ont rejoint le réseau',
          temoignages: temoignages.docs.map((t) => t.id),
        },
        S('faq', {
          surtitre: 'Questions fréquentes',
          titre: 'Vous vous demandez peut-être…',
          texte: 'Une autre question ? L’équipe répond sur WhatsApp.',
          boutons: [
            B('Commencer ma candidature', '/adherer/candidature'),
            B('Poser ma question', '/contact?motif=Adhésion'),
          ],
        }),
      ],
    },
    {
      title: 'Espace presse',
      chemin: '/presse',
      menu: 'Actualités',
      layout: [
        S('hero', {
          surtitre: 'Espace presse',
          titre: 'Pour les journalistes',
          texte: 'Communiqués, kit média et contact presse, accessibles sans compte.',
        }),
        C('kit', {
          titre: 'Kit média',
          cartes: [
            {
              titre: 'Logo REC 242',
              texte: 'Version horizontale et version carrée',
              libelleLien: 'PNG',
              lien: '/images/logo-rec242.jpg',
              image: await img('logos/rec242-logo-horizontal.jpg', 'Logo REC 242'),
            },
            {
              titre: 'Photos officielles',
              texte: 'Siège, événements',
              libelleLien: 'ZIP',
              image: await img('photos/reunion-table.webp', 'Assemblée générale de REC 242'),
            },
          ],
        }),
        S('interventions', {
          titre: 'Dernières interventions',
          texte: 'Les interventions du réseau dans les médias apparaîtront ici.',
        }),
        S('contact', {
          surtitre: 'Contact presse',
          titre: 'Yohan Dinga, communication et stratégie',
          texte: 'contact@rec242.cg · objet « Presse »',
          image: await img('personnes/yohan-dinga.webp', 'Yohan Dinga'),
          boutons: [B('Écrire au contact presse', '/contact?motif=Presse')],
        }),
      ],
    },
    {
      title: 'Mentions légales',
      chemin: '/mentions-legales',
      layout: [
        S('hero', {
          surtitre: 'Informations légales',
          titre: 'Mentions légales',
          note: 'Texte de travail à relire par le comité de direction.',
          aValider: true,
        }),
        legal([
          [
            'Éditeur',
            'REC 242, Réseau des Entrepreneurs Congolais, association régie par la loi du 1er juillet 1901. Siège : 165 rue Charles Foucault, Centre-Ville, Brazzaville. Contact : contact@rec242.cg.',
          ],
          ['Publication', 'Directrice de la publication : Eve, fondatrice de REC 242.'],
          ['Conception et réalisation', 'Webtinix, Brazzaville, contact@webtinix.com.'],
          ['Hébergement', 'À confirmer.'],
          [
            'Nom et emblème',
            'Leur usage est soumis à l’autorisation écrite du comité de direction (article 6 des statuts).',
          ],
        ]),
        liensLegaux([
          ['Politique de confidentialité', '/confidentialite'],
          ['Conditions d’utilisation', '/conditions-utilisation'],
          ['Contact', '/contact'],
        ]),
      ],
    },
    {
      title: 'Confidentialité',
      chemin: '/confidentialite',
      layout: [
        S('hero', {
          surtitre: 'Informations légales',
          titre: 'Politique de confidentialité',
          note: 'Texte de travail à relire par le comité de direction.',
          aValider: true,
        }),
        legal([
          [
            'Données collectées',
            'Formulaire d’adhésion (identité, coordonnées, entreprise, pièce d’identité), inscriptions aux événements, formulaires de contact et de partenariat, espace membre.',
          ],
          [
            'Pourquoi',
            'Examiner les candidatures, gérer les adhésions et les cotisations, organiser les événements, publier l’annuaire avec votre accord, répondre à vos messages.',
          ],
          [
            'Qui y a accès',
            'Les membres du comité de direction et les responsables désignés, selon leur rôle. Les données ne sont ni vendues ni cédées. L’annuaire public n’affiche que le nom de l’activité, le secteur et la ville.',
          ],
          ['Durée de conservation', 'À définir par le comité de direction.'],
          [
            'Vos droits',
            'Accès, correction, suppression, retrait de votre fiche de l’annuaire : écrivez à contact@rec242.cg.',
          ],
          ['Cookies et mesure d’audience', 'Mesure d’audience anonyme, sans cookie publicitaire.'],
        ]),
        liensLegaux([
          ['Mentions légales', '/mentions-legales'],
          ['Conditions d’utilisation', '/conditions-utilisation'],
          ['Contact', '/contact'],
        ]),
      ],
    },
    {
      title: 'Conditions d’utilisation',
      chemin: '/conditions-utilisation',
      layout: [
        S('hero', {
          surtitre: 'Espace membre',
          titre: 'Conditions d’utilisation de l’espace membre',
          note: 'Texte de travail à relire par le comité de direction.',
          aValider: true,
        }),
        legal([
          [
            'Accès',
            'L’espace est réservé aux membres au statut actif. Un membre suspendu ou dont la cotisation n’est pas soldée voit un message l’invitant à contacter le bureau.',
          ],
          [
            'Identifiants',
            'Votre adresse e-mail et un mot de passe d’au moins 10 caractères, personnels. Déconnexion automatique après 30 minutes d’inactivité.',
          ],
          [
            'Usage de l’annuaire',
            'Les coordonnées des membres servent aux échanges entre membres. La prospection de masse et la revente de données sont interdites.',
          ],
          [
            'Opportunités',
            'Chaque annonce est relue avant publication et expire à sa date limite. Le comité de direction peut retirer une annonce contraire à la charte.',
          ],
          [
            'Suspension',
            'Un manquement à la charte ou au règlement intérieur peut entraîner la suspension de l’accès, sur décision du comité de direction.',
          ],
        ]),
        liensLegaux([
          ['Mentions légales', '/mentions-legales'],
          ['Politique de confidentialité', '/confidentialite'],
          ['Contact', '/contact'],
        ]),
      ],
    },
  ]

  // Liens « document:Titre » : adresse de téléchargement du document correspondant.
  const docs = await payload.find({
    collection: 'documents',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  const resolve = (v: unknown): unknown => {
    if (typeof v === 'string' && v.startsWith('document:')) {
      const d = docs.docs.find((x) => (x as { titre?: string }).titre === v.slice(9))
      return d ? `/api/documents/${d.id}/telecharger` : '/'
    }
    if (Array.isArray(v)) return v.map(resolve)
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]))
    return v
  }

  for (const p of list) {
    p.layout = resolve(p.layout) as unknown[]
    const slug = slugify(p.title)
    const found = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    const existing = found.docs[0] as { id: number; layout?: unknown[] } | undefined
    if (existing?.layout?.length) continue
    const data = {
      title: p.title,
      chemin: p.chemin,
      menu: p.menu,
      layout: p.layout,
      _status: 'published',
    }
    if (existing)
      await payload.update({
        collection: 'pages',
        id: existing.id,
        data: data as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
    else
      await payload.create({
        collection: 'pages',
        data: data as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
  }
}

/** Liens « À lire aussi » des actualités de démonstration (maquette, écran 20). */
export async function seedLiensActualites(payload: Payload): Promise<void> {
  const [ag, formalisation] = await Promise.all([
    payload.find({
      collection: 'news',
      where: { slug: { equals: slugify('REC 242 tient son assemblée générale constitutive') } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pages',
      where: { chemin: { equals: '/formalisation' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const n = ag.docs[0] as { id: number; aLireAussi?: unknown } | undefined
  const p = formalisation.docs[0]
  if (n && p && !n.aLireAussi)
    await payload.update({
      collection: 'news',
      id: n.id,
      data: { aLireAussi: { relationTo: 'pages', value: p.id } } as never,
      overrideAccess: true,
      context: { skipAudit: true },
    })
}
