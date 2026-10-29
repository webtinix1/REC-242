import { APIError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'

import { atLeast, hasRole, isStaff } from '@/access/roles'
import { fill, renderEmail } from '@/emails/render'
import { getTemplate, notify } from '@/emails/send'
import type { TemplateKey } from '@/emails/defaults'
import {
  categorie,
  emailNormalise,
  MESSAGE_DOUBLON,
  MESSAGE_SECTEURS,
  SECTEURS_MAX,
  telephoneInternational,
} from '@/lib/adhesion/categories'
import { existeDoublon } from '@/lib/adhesion/doublon'
import {
  AGES,
  ANCIENNETES,
  AUTORISATIONS,
  CIVILITES,
  CONNU_PAR,
  EFFECTIFS,
  FORMES,
  label,
  OBJECTIFS,
  STATUTS_CANDIDATURE,
} from '@/lib/adhesion/options'
import { situationPaiement, type PaiementResume } from '@/lib/adhesion/paiement'
import { logAction } from '@/lib/audit'
import { celluleCsv } from '@/lib/csv'
import { convertirCandidature } from '@/lib/membres/conversion'
import { numeroDossier, numeroDossierCandidat, prochainNumero } from '@/lib/compteurs'

type Doc = Record<string, unknown> & {
  id: number
  numero?: number
  prenom?: string
  nom?: string
  email?: string
  raisonSociale?: string
  categorie?: string
  statut?: string
  createdAt?: string
  historique?: { date: string; auteur?: string; action: string }[]
  notes?: { auteurNom?: string; date: string; texte: string }[]
  emails?: { date: string; auteur?: string; modele?: string; objet: string }[]
  secteurs?: (number | { id: number; nom?: string })[]
  localite?: number | { nom?: string } | null
}

const nomUtilisateur = (req: PayloadRequest) => {
  const u = req.user as { name?: string; email?: string } | null
  return u?.name || u?.email || 'Système'
}

const corpsJson = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

const paiementsDe = async (
  payload: Payload,
  id: number,
  req?: PayloadRequest,
): Promise<PaiementResume[]> => {
  const r = await payload.find({
    collection: 'payments',
    where: { candidature: { equals: id } },
    overrideAccess: true,
    depth: 0,
    limit: 20,
    req,
  })
  return r.docs as unknown as PaiementResume[]
}

/** Variables communes des e-mails d'un dossier (modèles 1, 2, 3, 5). */
export async function variablesDossier(payload: Payload, d: Doc, req?: PayloadRequest) {
  const s = (await payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: true,
    req,
  })) as {
    whatsapp?: { numero?: string; lienChaine?: string }
  }
  const full = (await payload.findByID({
    collection: 'applications',
    id: d.id,
    depth: 1,
    overrideAccess: true,
    req,
  })) as unknown as Doc
  const cat = categorie(full.categorie)
  return {
    prenom: full.prenom,
    nom: full.nom,
    entreprise: full.raisonSociale,
    categorie: cat ? (cat.convention || cat.valeur === 'expert' ? cat.nom : cat.lettre) : '',
    numero_dossier: numeroDossierCandidat(full.numero, full.createdAt),
    situation_paiement: situationPaiement(
      full as never,
      await paiementsDe(payload, d.id, req),
    ).toLowerCase(),
    secteurs: (full.secteurs ?? [])
      .map((x) => (typeof x === 'object' ? x.nom : ''))
      .filter(Boolean)
      .join(', '),
    ville: typeof full.localite === 'object' ? full.localite?.nom : '',
    whatsapp: s.whatsapp?.numero,
    lien_chaine: s.whatsapp?.lienChaine,
    lien_back_office: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/admin/collections/applications/${d.id}`,
  }
}

const MODELES: Record<string, { cle: TemplateKey; nom: string }> = {
  accuse: { cle: 'candidatureConfirmation', nom: 'Accusé de réception' },
  complement: { cle: 'candidatureComplement', nom: 'Demande de complément' },
  bienvenue: { cle: 'bienvenueActivation', nom: 'Bienvenue et activation' },
  refus: { cle: 'refusMotive', nom: 'Refus motivé' },
}

const chargerDossier = async (
  req: PayloadRequest,
  niveau: 'read' | 'partial' = 'partial',
): Promise<Doc> => {
  if (!atLeast(req.user, 'candidatures', niveau)) throw new APIError('Action non autorisée.', 403)
  const id = req.routeParams?.id as string
  const d = await req.payload
    .findByID({ collection: 'applications', id, depth: 0, overrideAccess: false, req })
    .catch(() => null)
  if (!d) throw new APIError('Dossier introuvable.', 404)
  return d as unknown as Doc
}

const maj = (req: PayloadRequest, id: number, data: Record<string, unknown>) =>
  req.payload.update({
    collection: 'applications',
    id,
    data: data as never,
    overrideAccess: false,
    req,
  })

/** Champ obligatoire pour une candidature en ligne ; un bulletin papier peut ne pas le renseigner. */
const obligatoireEnLigne = (v: unknown, { data }: { data?: Record<string, unknown> }) =>
  data?.source === 'papier' || (Array.isArray(v) ? v.length > 0 : v != null && v !== '')
    ? true
    : 'Ce champ est obligatoire.'

/** Candidatures (écrans back-office 03 et 04 ; site 10). */
export const Applications: CollectionConfig = {
  slug: 'applications',
  labels: { singular: 'Candidature', plural: 'Candidatures' },
  admin: {
    group: 'Adhésions',
    useAsTitle: 'raisonSociale',
    defaultColumns: ['numero', 'nom', 'raisonSociale', 'categorie', 'statut', 'createdAt'],
    components: {
      views: {
        list: { Component: '@/components/admin/candidatures/CandidaturesView#CandidaturesView' },
        edit: {
          default: { Component: '@/components/admin/candidatures/CandidatureView#CandidatureView' },
        },
      },
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => atLeast(req.user, 'candidatures', 'read'),
    // Une candidature en ligne est créée par le serveur (action du site) ; l'équipe saisit les candidatures papier.
    create: ({ req }) => atLeast(req.user, 'candidatures', 'partial'),
    update: ({ req }) => atLeast(req.user, 'candidatures', 'partial'),
    delete: ({ req }) => hasRole(req.user, 'superadmin'),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if ('email' in data) data.email = emailNormalise(data.email as string)
        if ('telephone' in data) data.telephone = telephoneInternational(data.telephone as string)
        if (Array.isArray(data.secteurs) && data.secteurs.length > SECTEURS_MAX)
          throw new APIError(MESSAGE_SECTEURS, 400, null, true)
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create') {
          if (await existeDoublon(req.payload, data, { req }))
            throw new APIError(MESSAGE_DOUBLON, 409, null, true)
          data.numero = await prochainNumero(req.payload, 'dossier', req)
          data.statut = 'recue'
          data.historique = [
            {
              date: new Date().toISOString(),
              auteur: isStaff(req.user) ? nomUtilisateur(req) : 'Système',
              action: data.source === 'papier' ? 'Candidature papier saisie' : 'Candidature reçue',
            },
          ]
          if (categorie(data.categorie as string)?.convention) {
            data.modalite = undefined
            data.modePaiement = undefined
            data.operateur = undefined
            data.numeroPayeur = undefined
          }
          return data
        }
        // Téléphone ou e-mail modifiés : le contrôle de doublon s'applique aussi.
        if (
          originalDoc &&
          ((data.email && data.email !== originalDoc.email) ||
            (data.telephone && data.telephone !== originalDoc.telephone)) &&
          (await existeDoublon(
            req.payload,
            {
              email: data.email ?? originalDoc.email,
              telephone: data.telephone ?? originalDoc.telephone,
            },
            { sauf: originalDoc.id, req },
          ))
        )
          throw new APIError(MESSAGE_DOUBLON, 409, null, true)
        if (originalDoc && data.statut && data.statut !== originalDoc.statut) {
          if (
            data.statut === 'refusee' &&
            !String(data.motifRefus ?? originalDoc.motifRefus ?? '').trim()
          )
            throw new APIError('Indiquez le motif du refus : il est obligatoire.', 400, null, true)
          if (data.statut === 'active' && !req.context?.conversion)
            throw new APIError(
              'Le statut « Active » est posé par « Convertir en membre ».',
              400,
              null,
              true,
            )
          data.historique = [
            ...((data.historique as unknown[]) ?? originalDoc.historique ?? []),
            {
              date: new Date().toISOString(),
              auteur: nomUtilisateur(req),
              action: `Statut : ${label(STATUTS_CANDIDATURE, data.statut as string)}`,
            },
          ]
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const d = doc as Doc
        if (operation === 'create' && !req.context?.sansEmail) {
          const vars = await variablesDossier(req.payload, d, req)
          if (d.email)
            await notify(req.payload, { to: d.email, template: 'candidatureConfirmation', vars })
          const s = (await req.payload.findGlobal({
            slug: 'settings',
            depth: 0,
            overrideAccess: true,
            req,
          })) as {
            alertes?: { adresseAlerte?: string; copie?: string }
          }
          if (s.alertes?.adresseAlerte)
            await notify(req.payload, {
              to: s.alertes.adresseAlerte,
              cc: s.alertes.copie || undefined,
              template: 'candidatureAlerte',
              vars,
            })
        }
        if (operation === 'update' && previousDoc?.statut !== d.statut) {
          await logAction(req.payload, {
            req,
            categorie: 'validation',
            action: `Dossier ${numeroDossier(d.numero)} : statut « ${label(STATUTS_CANDIDATURE, d.statut)} »`,
            cible: numeroDossier(d.numero),
          })
          // Refus après paiement : le paiement passe à « remboursement à traiter » et le trésorier est prévenu (règle à fixer par REC 242).
          if (d.statut === 'refusee') {
            const payes = await req.payload.find({
              collection: 'payments',
              where: { and: [{ candidature: { equals: d.id } }, { statut: { equals: 'paye' } }] },
              overrideAccess: true,
              depth: 0,
              req,
            })
            for (const p of payes.docs)
              await req.payload.update({
                collection: 'payments',
                id: p.id,
                data: { statut: 'remboursement' } as never,
                overrideAccess: true,
                req,
              })
            if (payes.docs.length) {
              const tresoriers = await req.payload.find({
                collection: 'users',
                where: {
                  and: [{ roles: { contains: 'tresorier' } }, { statut: { equals: 'actif' } }],
                },
                overrideAccess: true,
                depth: 0,
                req,
              })
              const to = tresoriers.docs.map((u) => u.email).filter(Boolean) as string[]
              if (to.length)
                await notify(req.payload, {
                  to,
                  template: 'remboursementATraiter',
                  vars: {
                    numero_dossier: numeroDossier(d.numero),
                    candidat: `${d.prenom ?? ''} ${d.nom ?? ''}`.trim(),
                    lien_back_office: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/admin/collections/payments`,
                  },
                })
            }
          }
        }
        return doc
      },
    ],
  },
  endpoints: [
    {
      // « Convertir en membre » (écran 04) : fiche membre, fiche entreprise, numéro d'adhérent, lien d'activation.
      path: '/:id/convertir',
      method: 'post',
      handler: async (req) => {
        const d = await chargerDossier(req)
        const m = await convertirCandidature(req.payload, d.id as number, req)
        return Response.json({ membre: m.id, numeroAdherent: (m as { numeroAdherent?: string }).numeroAdherent })
      },
    },
    {
      // Candidature papier (écran 03) : mêmes contrôles qu'en ligne (anti-doublon, trois secteurs au maximum).
      path: '/papier',
      method: 'post',
      handler: async (req) => {
        if (!atLeast(req.user, 'candidatures', 'partial'))
          throw new APIError('Action non autorisée.', 403)
        const b = await corpsJson(req)
        const nomComplet = String(b.nomComplet ?? '')
          .trim()
          .replace(/\s+/g, ' ')
        const erreurs: Record<string, string> = {}
        if (!nomComplet) erreurs.nomComplet = 'Indiquez le nom et le prénom.'
        if (!String(b.telephone ?? '').trim() && !String(b.email ?? '').trim())
          erreurs.telephone = 'Indiquez un téléphone ou un e-mail.'
        if (!String(b.raisonSociale ?? '').trim())
          erreurs.raisonSociale = 'Indiquez l’activité ou la raison sociale.'
        if (!b.consentement)
          erreurs.consentement = 'Le consentement et la charte doivent être signés sur le bulletin.'
        const noms = String(b.secteurs ?? '')
          .split(/[,;]/)
          .map((x) => x.trim())
          .filter(Boolean)
        if (noms.length > SECTEURS_MAX) erreurs.secteurs = MESSAGE_SECTEURS
        const tous = await req.payload.find({
          collection: 'sectors',
          limit: 100,
          depth: 0,
          overrideAccess: true,
          req,
        })
        const secteurs = noms.map(
          (n) =>
            tous.docs.find((s) => (s as { nom: string }).nom.toLowerCase() === n.toLowerCase())?.id,
        )
        if (!erreurs.secteurs && secteurs.some((x) => !x))
          erreurs.secteurs = 'Secteur inconnu : utilisez les noms de la liste des secteurs.'
        if (!noms.length) erreurs.secteurs = 'Indiquez au moins un secteur.'
        const paiement = b.paiement as
          { montant?: number; mode?: string; reference?: string; objet?: string } | undefined
        if (paiement?.montant && !atLeast(req.user, 'cotisations', 'full'))
          erreurs.paiement = 'Seul le trésorier ou un administrateur enregistre un paiement.'
        if (Object.keys(erreurs).length) return Response.json({ erreurs }, { status: 400 })
        const mots = nomComplet.split(' ')
        const nom = mots.length > 1 ? mots[mots.length - 1] : nomComplet
        const prenom = mots.length > 1 ? mots.slice(0, -1).join(' ') : ''
        const doc = (await req.payload.create({
          collection: 'applications',
          req,
          overrideAccess: false,
          data: {
            source: 'papier',
            papierLieu: String(b.lieu ?? '').trim() || 'Passage au siège',
            bulletin: b.bulletin || undefined,
            nom,
            prenom,
            telephone: String(b.telephone ?? ''),
            email: String(b.email ?? ''),
            raisonSociale: String(b.raisonSociale),
            categorie: String(b.categorie ?? 'A'),
            localite: b.localite,
            secteurs,
            consentement: true,
            acceptationTextes: true,
            charteSignee: true,
            modePaiement: 'siege',
          } as never,
        })) as unknown as Doc
        if (paiement?.montant) {
          await req.payload.create({
            collection: 'payments',
            req,
            overrideAccess: false,
            data: {
              candidature: doc.id,
              objet: paiement.objet || 'adhesion',
              montant: Math.round(Number(paiement.montant)),
              mode: paiement.mode || 'especes',
              referenceOperateur: paiement.reference,
              statut: 'paye',
            } as never,
          })
        }
        return Response.json({ ok: true, id: doc.id, numero: numeroDossier(doc.numero) })
      },
    },
    {
      // Change le statut ; « Refusée » exige un motif et envoie l'e-mail de refus (texte modifiable avant l'envoi).
      path: '/:id/statut',
      method: 'post',
      handler: async (req) => {
        const d = await chargerDossier(req)
        const b = await corpsJson(req)
        const statut = String(b.statut ?? '')
        if (!STATUTS_CANDIDATURE.some((s) => s.value === statut))
          throw new APIError('Statut inconnu.', 400)
        const motif = String(b.motif ?? '').trim()
        await maj(req, d.id, { statut, ...(statut === 'refusee' ? { motifRefus: motif } : {}) })
        if (statut === 'refusee' && d.email && b.objet && b.corps) {
          await envoyerEmail(req, d, 'refus', String(b.objet), String(b.corps))
        }
        return Response.json({ ok: true })
      },
    },
    {
      path: '/:id/rendez-vous',
      method: 'post',
      handler: async (req) => {
        const d = await chargerDossier(req)
        const b = await corpsJson(req)
        const data: Record<string, unknown> = {}
        for (const k of ['pieceVerifiee', 'charteSignee', 'avisCommission'])
          if (k in b) data[k] = Boolean(b[k])
        if ('rendezVous' in b) data.rendezVous = b.rendezVous || null
        await maj(req, d.id, data)
        return Response.json({ ok: true })
      },
    },
    {
      path: '/:id/note',
      method: 'post',
      handler: async (req) => {
        const d = await chargerDossier(req)
        const texte = String((await corpsJson(req)).texte ?? '').trim()
        if (!texte) throw new APIError('La note est vide.', 400)
        await maj(req, d.id, {
          notes: [
            ...(d.notes ?? []),
            { auteurNom: nomUtilisateur(req), date: new Date().toISOString(), texte },
          ],
        })
        return Response.json({ ok: true })
      },
    },
    {
      // Brouillon d'un e-mail modèle, rempli avec les données du dossier, à relire avant l'envoi.
      path: '/:id/email/:modele',
      method: 'get',
      handler: async (req) => {
        const d = await chargerDossier(req)
        const m = MODELES[req.routeParams?.modele as string]
        if (!m) throw new APIError('Modèle inconnu.', 404)
        const tpl = await getTemplate(req.payload, m.cle)
        const vars = {
          ...(await variablesDossier(req.payload, d, req)),
          complement: '…',
          motif: String((d as { motifRefus?: string }).motifRefus || '…'),
          texte_remboursement: '',
        }
        return Response.json({
          nom: m.nom,
          objet: fill(tpl.objet, vars),
          corps: fill(tpl.corps, vars),
        })
      },
    },
    {
      path: '/:id/email',
      method: 'post',
      handler: async (req) => {
        const d = await chargerDossier(req)
        const b = await corpsJson(req)
        const modele = String(b.modele ?? '')
        if (!MODELES[modele]) throw new APIError('Modèle inconnu.', 400)
        if (!String(b.objet ?? '').trim() || !String(b.corps ?? '').trim())
          throw new APIError('Objet et message sont obligatoires.', 400)
        if (!d.email) throw new APIError('Ce dossier n’a pas d’adresse e-mail.', 400)
        await envoyerEmail(req, d, modele, String(b.objet), String(b.corps))
        if (modele === 'complement' && d.statut !== 'complement')
          await maj(req, d.id, { statut: 'complement' })
        return Response.json({ ok: true })
      },
    },
    {
      path: '/export',
      method: 'get',
      handler: async (req) => {
        if (!atLeast(req.user, 'candidatures', 'read'))
          throw new APIError('Action non autorisée.', 403)
        const r = await req.payload.find({
          collection: 'applications',
          req,
          overrideAccess: false,
          limit: 5000,
          depth: 1,
          sort: '-createdAt',
        })
        // Cellule toujours entre guillemets et neutralisée : une valeur saisie « =… » ne devient pas une formule.
        const esc = (v: unknown) => celluleCsv(v, true)
        const cols = [
          'Dossier',
          'Reçue le',
          'Source',
          'Nom',
          'Prénom',
          'Téléphone',
          'E-mail',
          'Entreprise',
          'Catégorie',
          'Secteurs',
          'Ville',
          'Statut',
        ]
        const lignes = r.docs.map((x) => {
          const d = x as unknown as Doc
          return [
            numeroDossier(d.numero),
            new Date(d.createdAt ?? '').toLocaleDateString('fr-FR', {
              timeZone: 'Africa/Brazzaville',
            }),
            d.source === 'papier' ? 'Papier' : 'En ligne',
            d.nom,
            d.prenom,
            d.telephone,
            d.email,
            d.raisonSociale,
            categorie(d.categorie)?.nom,
            (d.secteurs ?? []).map((s) => (typeof s === 'object' ? s.nom : '')).join(', '),
            typeof d.localite === 'object' ? d.localite?.nom : '',
            label(STATUTS_CANDIDATURE, d.statut),
          ]
            .map(esc)
            .join(';')
        })
        await logAction(req.payload, {
          req,
          categorie: 'export',
          action: `A exporté ${r.docs.length} candidature(s)`,
        })
        return new Response('﻿' + [cols.map(esc).join(';'), ...lignes].join('\r\n'), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="candidatures-rec242.csv"',
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'numero',
          label: 'Numéro de dossier',
          type: 'number',
          unique: true,
          admin: { readOnly: true },
        },
        {
          name: 'source',
          label: 'Source',
          type: 'select',
          defaultValue: 'en-ligne',
          options: [
            { value: 'en-ligne', label: 'En ligne' },
            { value: 'papier', label: 'Bulletin papier' },
          ],
        },
        {
          name: 'papierLieu',
          label: 'Reçu lors de',
          type: 'text',
          admin: { condition: (d) => d?.source === 'papier' },
        },
        {
          name: 'bulletin',
          label: 'Bulletin scanné',
          type: 'upload',
          relationTo: 'pieces',
          admin: { condition: (d) => d?.source === 'papier' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Vous',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'civilite', label: 'Civilité', type: 'select', options: CIVILITES },
            { name: 'fonction', label: 'Fonction dans l’entreprise', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'nom', label: 'Nom', type: 'text', required: true },
            { name: 'prenom', label: 'Prénom', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'telephone',
              label: 'Téléphone ou WhatsApp',
              type: 'text',
              required: true,
              index: true,
            },
            { name: 'email', label: 'E-mail', type: 'email', required: true, index: true },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'trancheAge',
              label: 'Tranche d’âge',
              type: 'select',
              options: AGES,
              validate: obligatoireEnLigne,
            },
            {
              name: 'pieceIdentite',
              label: 'Numéro de pièce d’identité',
              type: 'text',
              access: { read: ({ req }) => atLeast(req.user, 'candidatures', 'read') },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Votre entreprise',
      fields: [
        {
          name: 'raisonSociale',
          label: 'Raison sociale ou nom du projet',
          type: 'text',
          required: true,
        },
        {
          type: 'row',
          fields: [
            { name: 'formeJuridique', label: 'Forme juridique', type: 'select', options: FORMES },
            { name: 'rccm', label: 'Numéro RCCM', type: 'text' },
            { name: 'anneeCreation', label: 'Année de création', type: 'text' },
            { name: 'effectif', label: 'Tranche d’effectif', type: 'select', options: EFFECTIFS },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'localite',
              label: 'Localisation',
              type: 'relationship',
              relationTo: 'localities',
              required: true,
            },
            { name: 'quartier', label: 'Quartier', type: 'text' },
          ],
        },
        {
          name: 'description',
          label: 'Description de l’activité ou du projet',
          type: 'textarea',
          validate: obligatoireEnLigne,
        },
        { name: 'services', label: 'Compétences ou services proposés au réseau', type: 'text' },
        {
          name: 'secteurs',
          label: 'Secteurs d’activité (trois au maximum)',
          type: 'relationship',
          relationTo: 'sectors',
          hasMany: true,
          required: true,
          maxRows: SECTEURS_MAX,
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Votre projet',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'anciennete',
              label: 'Ancienneté dans l’activité',
              type: 'select',
              options: ANCIENNETES,
              validate: obligatoireEnLigne,
            },
            {
              name: 'connuPar',
              label: 'Comment avez-vous connu REC 242 ?',
              type: 'select',
              options: CONNU_PAR,
            },
            { name: 'parrain', label: 'Parrain éventuel', type: 'text' },
          ],
        },
        {
          name: 'objectifs',
          label: 'Ce que vous attendez du réseau',
          type: 'select',
          hasMany: true,
          options: OBJECTIFS,
          validate: obligatoireEnLigne,
        },
        {
          name: 'categorie',
          label: 'Catégorie',
          type: 'select',
          required: true,
          options: [
            { value: 'A', label: 'A · Individuel, informel, porteur de projet' },
            { value: 'B', label: 'B · Établissement, commerçant formalisé' },
            { value: 'C', label: 'C · Entreprise, société' },
            { value: 'expert', label: 'Expert' },
            { value: 'partenaire', label: 'Partenaire' },
            { value: 'honneur', label: 'Membre d’honneur' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Paiement',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'modalite',
              label: 'Modalité',
              type: 'select',
              options: [
                { value: 'une-fois', label: 'En une fois' },
                { value: 'deux-tranches', label: 'En deux tranches' },
              ],
            },
            {
              name: 'modePaiement',
              label: 'Mode',
              type: 'select',
              options: [
                { value: 'mobile', label: 'Paiement mobile' },
                { value: 'siege', label: 'Au siège' },
              ],
            },
            {
              name: 'operateur',
              label: 'Opérateur',
              type: 'select',
              options: [
                { value: 'mtn', label: 'MTN MoMo' },
                { value: 'airtel', label: 'Airtel Money' },
              ],
            },
            { name: 'numeroPayeur', label: 'Numéro payeur', type: 'text' },
          ],
        },
        {
          name: 'paiements',
          label: 'Paiements',
          type: 'join',
          collection: 'payments',
          on: 'candidature',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Validation',
      fields: [
        {
          name: 'pieces',
          label: 'Pièces justificatives',
          type: 'upload',
          relationTo: 'pieces',
          hasMany: true,
        },
        {
          name: 'autorisations',
          label: 'Visibilité et autorisations',
          type: 'group',
          fields: AUTORISATIONS.map((a) => ({
            name: a.name,
            label: a.label,
            type: 'checkbox' as const,
            defaultValue: false,
          })),
        },
        {
          name: 'consentement',
          label: 'Consentement au traitement des données',
          type: 'checkbox',
          validate: (v: unknown) => (v === true ? true : 'Le consentement est obligatoire.'),
        },
        {
          name: 'acceptationTextes',
          label: 'Acceptation des statuts, du règlement et de la charte',
          type: 'checkbox',
          validate: (v: unknown) =>
            v === true ? true : 'L’acceptation des textes est obligatoire.',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Suivi',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'statut',
              label: 'Statut',
              type: 'select',
              defaultValue: 'recue',
              options: STATUTS_CANDIDATURE,
              index: true,
            },
            {
              name: 'responsable',
              label: 'Responsable attribué',
              type: 'relationship',
              relationTo: 'users',
            },
            { name: 'rendezVous', label: 'Rendez-vous', type: 'date' },
            { name: 'membre', label: 'Membre créé', type: 'relationship', relationTo: 'members', admin: { readOnly: true } },
          ],
        },
        { name: 'motifRefus', label: 'Motif du refus', type: 'textarea' },
        {
          type: 'row',
          fields: [
            {
              name: 'pieceVerifiee',
              label: 'Pièce d’identité vérifiée en main propre',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'charteSignee',
              label: 'Charte de l’adhérent signée',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'avisCommission',
              label: 'Avis de la commission Éthique et Vérification',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          name: 'notes',
          label: 'Notes internes',
          type: 'array',
          fields: [
            { name: 'auteurNom', label: 'Auteur', type: 'text' },
            { name: 'date', type: 'date' },
            { name: 'texte', type: 'textarea', required: true },
          ],
        },
        {
          name: 'emails',
          label: 'E-mails envoyés',
          type: 'array',
          admin: { readOnly: true },
          fields: [
            { name: 'date', type: 'date' },
            { name: 'auteur', type: 'text' },
            { name: 'modele', type: 'text' },
            { name: 'objet', type: 'text' },
          ],
        },
        {
          name: 'historique',
          label: 'Historique',
          type: 'array',
          admin: { readOnly: true },
          fields: [
            { name: 'date', type: 'date' },
            { name: 'auteur', type: 'text' },
            { name: 'action', type: 'text' },
          ],
        },
      ],
    },
  ],
}

/** Envoie un e-mail de dossier (texte relu dans le back-office) et le trace dans l'historique. */
async function envoyerEmail(
  req: PayloadRequest,
  d: Doc,
  modele: string,
  objet: string,
  corps: string,
) {
  const s = (await req.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: true,
    req,
  })) as {
    adresse?: string
    whatsapp?: { numero?: string }
  }
  const { html, text, subject } = renderEmail(
    objet,
    corps,
    {},
    { adresse: s.adresse, whatsapp: s.whatsapp?.numero },
  )
  await req.payload.sendEmail({ to: d.email, subject, html, text })
  const now = new Date().toISOString()
  const frais = (await req.payload.findByID({
    collection: 'applications',
    id: d.id,
    depth: 0,
    overrideAccess: true,
    req,
  })) as unknown as Doc
  await req.payload.update({
    collection: 'applications',
    id: d.id,
    overrideAccess: true,
    req,
    data: {
      emails: [
        ...(frais.emails ?? []),
        { date: now, auteur: nomUtilisateur(req), modele: MODELES[modele]?.nom, objet: subject },
      ],
      historique: [
        ...(frais.historique ?? []),
        {
          date: now,
          auteur: nomUtilisateur(req),
          action: `E-mail « ${MODELES[modele]?.nom} » envoyé`,
        },
      ],
    } as never,
  })
}
