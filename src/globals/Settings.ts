import type { Field, FieldAccess, GlobalConfig, Tab } from 'payload'

import { atLeast, hasRole, isStaff } from '@/access/roles'
import { logAction } from '@/lib/audit'

const fcfa = (name: string, label: string): Field => ({
  name,
  label,
  type: 'number',
  min: 0,
  admin: { description: 'En FCFA, sans espace.' },
})

const adminsOnly = {
  update: ({ req }: { req: { user?: unknown } }) =>
    hasRole(req.user as never, 'superadmin', 'admin'),
}

/**
 * Paramètres du site (écran 15). Les globals « keyFigures », « pricing » et « directoryEdition » de
 * docs/03-modele-de-donnees.md sont regroupés ici en onglets, comme dans la maquette.
 */
export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Paramètres',
  admin: { group: 'Administration' },
  access: {
    read: () => true,
    update: ({ req }) => atLeast(req.user, 'parametres', 'partial'),
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (previousDoc?.whatsapp?.lienGroupe !== doc?.whatsapp?.lienGroupe) {
          await logAction(req.payload, {
            req,
            categorie: 'parametres',
            action: 'A modifié le lien du groupe WhatsApp des membres',
          })
        }
        if (
          JSON.stringify(previousDoc?.tarifs) !== JSON.stringify(doc?.tarifs) ||
          JSON.stringify(previousDoc?.annuaire) !== JSON.stringify(doc?.annuaire)
        ) {
          await logAction(req.payload, {
            req,
            categorie: 'parametres',
            action: 'A modifié les tarifs',
          })
        }
        if (
          JSON.stringify({ ...previousDoc, whatsapp: 0, tarifs: 0, annuaire: 0, updatedAt: 0 }) !==
          JSON.stringify({ ...doc, whatsapp: 0, tarifs: 0, annuaire: 0, updatedAt: 0 })
        ) {
          await logAction(req.payload, {
            req,
            categorie: 'parametres',
            action: 'A modifié les paramètres du site',
          })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Coordonnées',
          description:
            "Ces informations s'affichent sur le site (en-tête, pied de page, page Contact, mentions légales) et dans les e-mails automatiques envoyés aux candidats et aux membres.",
          fields: [
            { name: 'adresse', label: 'Adresse du siège', type: 'text' },
            {
              type: 'row',
              fields: [
                { name: 'email', label: 'E-mail de contact', type: 'email' },
                { name: 'horaires', label: 'Horaires', type: 'text' },
              ],
            },
            {
              name: 'reseauxSociaux',
              label: 'Réseaux sociaux',
              type: 'array',
              labels: { singular: 'Réseau', plural: 'Réseaux' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'reseau',
                      label: 'Réseau',
                      type: 'select',
                      required: true,
                      options: ['Facebook', 'LinkedIn', 'Instagram', 'X', 'YouTube', 'TikTok'].map(
                        (v) => ({ value: v.toLowerCase(), label: v }),
                      ),
                    },
                    { name: 'url', label: 'Lien', type: 'text', required: true },
                  ],
                },
              ],
            },
            {
              name: 'planAcces',
              label: 'Plan d’accès',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'latitude', label: 'Latitude', type: 'number' },
                    { name: 'longitude', label: 'Longitude', type: 'number' },
                  ],
                },
                {
                  name: 'indications',
                  label: 'Indications',
                  type: 'textarea',
                  admin: { description: 'Une indication par ligne (taxi, stationnement…).' },
                },
              ],
            },
          ],
        },
        {
          label: 'WhatsApp',
          name: 'whatsapp',
          fields: [
            {
              name: 'numero',
              label: 'Numéro WhatsApp',
              type: 'text',
              admin: { description: 'Format international, par exemple +242 06 725 79 50.' },
            },
            { name: 'lienChaine', label: 'Lien de la chaîne (public)', type: 'text' },
            {
              name: 'lienGroupe',
              label: 'Lien du groupe des membres (réservé)',
              type: 'text',
              access: { read: ({ req }) => Boolean(req.user) },
              admin: {
                description:
                  'À changer immédiatement si le lien circule hors du réseau. Le changement est inscrit au journal.',
              },
            },
          ],
        },
        {
          label: 'Chiffres clés',
          description:
            "Jusqu'à quatre chiffres clés. Un chiffre vide n'apparaît pas sur le site ; aucune valeur par défaut.",
          fields: [
            {
              name: 'chiffresCles',
              label: 'Chiffres clés',
              type: 'array',
              maxRows: 4,
              labels: { singular: 'Chiffre', plural: 'Chiffres' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'libelle', label: 'Libellé', type: 'text', required: true },
                    {
                      name: 'mode',
                      label: 'Valeur',
                      type: 'select',
                      required: true,
                      defaultValue: 'saisi',
                      options: [
                        { value: 'saisi', label: 'Saisie à la main' },
                        { value: 'membresActifs', label: 'Calculée : membres actifs' },
                        { value: 'entreprises', label: 'Calculée : entreprises représentées' },
                        { value: 'secteurs', label: 'Calculée : secteurs représentés' },
                      ],
                    },
                    {
                      name: 'valeur',
                      label: 'Valeur saisie',
                      type: 'text',
                      admin: { condition: (_d, s) => s?.mode === 'saisi' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Tarifs',
          description:
            "Montants en FCFA. Ils s'affichent sur la page Adhérer, dans la candidature et dans l'espace membre. Un changement s'applique aux nouvelles candidatures et aux renouvellements suivants, jamais à une échéance déjà émise. Partenaires et membres d'honneur : montant fixé par convention. Réservé aux administrateurs ; chaque changement est inscrit au journal.",
          fields: [
            {
              name: 'tarifs',
              label: 'Catégories et cotisations',
              type: 'group',
              access: adminsOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    fcfa('droitA', 'Droit d’adhésion A'),
                    fcfa('cotisationA', 'Cotisation annuelle A'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    fcfa('droitB', 'Droit d’adhésion B'),
                    fcfa('cotisationB', 'Cotisation annuelle B'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    fcfa('droitC', 'Droit d’adhésion C'),
                    fcfa('cotisationC', 'Cotisation annuelle C'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    fcfa('droitExpert', 'Droit d’adhésion Expert'),
                    fcfa('cotisationExpert', 'Cotisation annuelle Expert'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'delaiMois',
                      label: 'Délai pour solder la cotisation (mois)',
                      type: 'number',
                      min: 1,
                    },
                    {
                      name: 'tranchesMax',
                      label: 'Nombre de tranches au plus',
                      type: 'number',
                      min: 1,
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'relances',
                      label: 'Relances avant constat de perte',
                      type: 'number',
                      min: 1,
                    },
                    {
                      name: 'intervalleRelancesJours',
                      label: 'Intervalle minimal entre relances (jours)',
                      type: 'number',
                      min: 1,
                    },
                  ],
                },
              ],
            },
            {
              name: 'annuaire',
              label: 'Annuaire imprimé',
              type: 'group',
              access: adminsOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'edition', label: 'Édition en cours', type: 'text' },
                    {
                      name: 'cloture',
                      label: 'Date de clôture des fiches',
                      type: 'date',
                      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    fcfa('encartLogo', 'Encart logo agrandi'),
                    fcfa('encartDemiPage', 'Demi-page'),
                    fcfa('encartPleinePage', 'Pleine page'),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'E-mails automatiques',
          name: 'alertes',
          description:
            'À chaque nouvelle candidature : un e-mail d’alerte à l’adresse ci-dessous et une pastille rouge sur le tableau de bord.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'adresseAlerte',
                  label: 'Adresse d’alerte des candidatures',
                  type: 'email',
                },
                { name: 'copie', label: 'Copie', type: 'email' },
              ],
            },
            {
              name: 'alertesAussi',
              label: 'Alertes aussi pour',
              type: 'select',
              defaultValue: 'messages',
              options: [
                { value: 'messages', label: 'Messages de contact et demandes d’experts' },
                { value: 'candidatures', label: 'Candidatures uniquement' },
              ],
            },
            {
              name: 'lienModeles',
              type: 'ui',
              admin: {
                components: { Field: '@/components/admin/EmailTemplatesLink#EmailTemplatesLink' },
              },
            },
            {
              name: 'reponsesTypes',
              label: 'Réponses types des messages',
              type: 'array',
              labels: { singular: 'Réponse type', plural: 'Réponses types' },
              admin: {
                description:
                  'Proposées dans la boîte de réception (écran Messages). {{prenom}} et {{nom}} sont remplacés par ceux de l’expéditeur ; le texte reste modifiable avant l’envoi.',
                initCollapsed: true,
              },
              fields: [
                { name: 'titre', label: 'Titre', type: 'text', required: true },
                { name: 'texte', label: 'Texte', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'Référencement',
          name: 'seo',
          fields: [
            { name: 'titre', label: 'Titre du site', type: 'text' },
            { name: 'description', label: 'Description par défaut', type: 'textarea' },
            {
              name: 'image',
              label: 'Image de partage par défaut',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
      ],
    },
  ],
}

/**
 * Droits par champ (docs/04-roles-et-droits.md) : « Paramètres et SEO » est complet pour le super administrateur et
 * l'administrateur ; le droit partiel de l'éditeur ne porte que sur le référencement des contenus qu'il édite (pages,
 * actualités), pas sur ces paramètres. Ses modifications sont ignorées champ par champ, comme celles des tarifs.
 * Les alertes et les réponses types sont internes : elles ne sont jamais renvoyées au public.
 */
const lectureEquipe: FieldAccess = ({ req }) => isStaff(req.user)
const proteger = (fields: Field[], interne: boolean): Field[] =>
  fields.map((f) => {
    if ('name' in f && f.name && f.type !== 'ui') {
      const access = { update: adminsOnly.update, ...(interne ? { read: lectureEquipe } : {}), ...(f.access ?? {}) }
      return { ...f, access } as Field
    }
    if (f.type === 'row' || f.type === 'collapsible') return { ...f, fields: proteger(f.fields, interne) } as Field
    return f
  })
const onglets = Settings.fields[0] as { type: 'tabs'; tabs: Tab[] }
onglets.tabs = onglets.tabs.map((t) => ({ ...t, fields: proteger(t.fields, 'name' in t && t.name === 'alertes') }) as Tab)
