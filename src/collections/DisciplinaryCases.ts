import { APIError, type CollectionConfig, type Endpoint, type Payload, type PayloadRequest } from 'payload'

import { extraFull, extraRead } from '@/access/roles'
import { notify } from '@/emails/send'
import { logAction } from '@/lib/audit'
import { prochainNumero } from '@/lib/compteurs'
import { courrierDiscipline } from '@/lib/discipline/courrier'
import {
  DELAI_DEFENSE_JOURS,
  DELAI_RECOURS_JOURS,
  ETAPES,
  GRIEFS,
  plusJours,
  plusMois,
  refusTransition,
  SANCTIONS,
  type Dossier,
  type Etape,
} from '@/lib/discipline/regles'

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
const jour = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : '')
const corps = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

type Cas = Dossier & { id: number; numero: string; membre: number | { id: number }; historique?: { date: string; etape: string; auteur?: string }[] }

const membreDe = async (req: PayloadRequest, c: Cas) =>
  (await req.payload.findByID({ collection: 'members', id: idDe(c.membre) as number, depth: 0, overrideAccess: true, req })) as unknown as {
    id: number
    email: string
    prenom?: string
    nom?: string
    numeroAdherent?: string
    statut: string
    entreprise?: number | null
  }

/** Une étape de la procédure : contrôle de l'ordre (article 15), enregistrement, courrier, journal. */
const etape = (vers: Etape, appliquer: (req: PayloadRequest, c: Cas, b: Record<string, unknown>) => Promise<Record<string, unknown>>): Endpoint => ({
  path: `/:id/${vers}`,
  method: 'post',
  handler: async (req) => {
    // Discipline (docs/04-roles-et-droits.md, domaines ajoutés) : décisions du super administrateur et de l'administrateur.
    if (!extraFull(req.user, 'discipline')) throw new APIError('Action réservée aux administrateurs.', 403)
    const c = (await req.payload.findByID({ collection: 'disciplinaryCases', id: req.routeParams?.id as string, depth: 0, overrideAccess: false, req }).catch(() => null)) as unknown as Cas | null
    if (!c) throw new APIError('Dossier introuvable.', 404)
    const b = await corps(req)
    // Les données saisies avec l'étape sont contrôlées avec le dossier tel qu'il serait après l'étape.
    const prevu = { ...c, ...b } as Dossier
    const refus = refusTransition({ ...prevu, statut: c.statut }, vers)
    if (refus) throw new APIError(refus, 400, null, true)
    const maj = await appliquer(req, c, b)
    const auteur = (req.user as { name?: string } | null)?.name ?? ''
    await req.payload.update({
      collection: 'disciplinaryCases',
      id: c.id,
      overrideAccess: true,
      req,
      context: { etape: true },
      data: { ...maj, statut: vers, historique: [...(c.historique ?? []), { date: new Date().toISOString(), etape: vers, auteur }] } as never,
    })
    await logAction(req.payload, { req, categorie: 'discipline', action: `Dossier ${c.numero} : ${ETAPES.find((e) => e.value === vers)?.label}`, cible: c.numero })
    return Response.json({ ok: true })
  },
})

const labelSanction = (s?: string | null, mois?: number | null) =>
  s === 'suspension' ? `suspension de ${mois} mois` : (SANCTIONS.find((x) => x.value === s)?.label ?? '').toLowerCase()

const griefs = etape('griefs', async (req, c, b) => {
  const m = await membreDe(req, c)
  const maintenant = new Date()
  const finDefense = plusJours(maintenant, DELAI_DEFENSE_JOURS)
  const liste = ((b.griefs as string[] | undefined) ?? c.griefs ?? []).map((g) => GRIEFS.find((x) => x.value === g)?.label ?? g)
  const faits = String(b.faits ?? c.faits ?? '')
  const envisagee = String(b.sanctionEnvisagee ?? c.sanctionEnvisagee ?? '')
  const pdf = await courrierDiscipline('griefs', {
    numero: c.numero,
    membre: `${m.prenom ?? ''} ${m.nom ?? ''}`.trim(),
    date: jour(maintenant),
    lignes: [`Griefs : ${liste.join(' ; ')}.`, `Faits : ${faits}`, `Sanction envisagée : ${labelSanction(envisagee, null)}.`, `Défense écrite à présenter avant le ${jour(finDefense)}.`],
  })
  await notify(req.payload, {
    to: m.email,
    template: 'disciplineGriefs',
    vars: { prenom: m.prenom, numero: c.numero, griefs: liste.join(' ; '), faits, sanction_envisagee: labelSanction(envisagee, null), date_limite_defense: jour(finDefense) },
    attachments: [{ filename: `griefs-${c.numero}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
  })
  // Le membre reste actif pendant la procédure tant qu'aucune sanction n'est prononcée.
  return { griefs: b.griefs ?? c.griefs, faits, sanctionEnvisagee: envisagee, dateGriefs: maintenant.toISOString(), finDefense: finDefense.toISOString() }
})

const defense = etape('defense', async (_req, _c, b) => ({ defense: String(b.defense ?? ''), dateDefense: new Date().toISOString() }))

const avis = etape('avis', async (_req, _c, b) => ({ avis: String(b.avis ?? ''), dateAvis: new Date().toISOString() }))

const decision = etape('decision', async (req, c, b) => {
  const m = await membreDe(req, c)
  const maintenant = new Date()
  const sanction = String(b.sanction ?? '')
  const mois = sanction === 'suspension' ? Number(b.dureeMois) : null
  const motivation = String(b.motivation ?? '')
  const finRecours = plusJours(maintenant, DELAI_RECOURS_JOURS)
  // Suspension : immédiate (le recours n'est pas suspensif). Exclusion : suspension conservatoire jusqu'à la fin du délai de recours.
  if (sanction === 'suspension' || sanction === 'exclusion') {
    const jusqua = sanction === 'suspension' ? plusMois(maintenant, mois as number) : null
    await req.payload.update({
      collection: 'members',
      id: m.id,
      overrideAccess: true,
      req,
      context: { sansMotif: true },
      data: {
        statut: 'suspendu',
        motifStatut: sanction === 'suspension' ? `Suspension disciplinaire de ${mois} mois (dossier ${c.numero})` : `Exclusion prononcée, suspension conservatoire (dossier ${c.numero})`,
        suspenduJusquau: jusqua ? jusqua.toISOString() : null,
      } as never,
    })
  }
  const pdf = await courrierDiscipline('decision', {
    numero: c.numero,
    membre: `${m.prenom ?? ''} ${m.nom ?? ''}`.trim(),
    date: jour(maintenant),
    lignes: [`Sanction prononcée : ${labelSanction(sanction, mois)}, à compter du ${jour(maintenant)}.`, `Motivation : ${motivation}`, `Recours possible devant l’assemblée générale jusqu’au ${jour(finRecours)}.`],
  })
  await notify(req.payload, {
    to: m.email,
    template: 'disciplineDecision',
    vars: { prenom: m.prenom, numero: c.numero, sanction: labelSanction(sanction, mois), date_effet: jour(maintenant), motivation, date_limite_recours: jour(finRecours) },
    attachments: [{ filename: `decision-${c.numero}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
  })
  return { sanction, dureeMois: mois, motivation, dateDecision: maintenant.toISOString(), finRecours: finRecours.toISOString() }
})

const recours = etape('recours', async (_req, _c, b) => ({ recours: { date: new Date().toISOString(), texte: String(b.texte ?? '') } }))

/** Clôture : dossier classé sans suite, ou issue du recours (décision de l'assemblée générale). */
const clore = etape('close', async (req, c, b) => {
  const issue = String(b.issue ?? '')
  const m = await membreDe(req, c)
  if (c.statut === 'recours' && issue === 'annulee' && m.statut === 'suspendu') {
    // L'assemblée annule la sanction : le membre retrouve son accès.
    await req.payload.update({ collection: 'members', id: m.id, overrideAccess: true, req, context: { sansMotif: true }, data: { statut: 'actif', motifStatut: `Sanction annulée par l’assemblée générale (dossier ${c.numero})`, suspenduJusquau: null } as never })
  }
  if (c.statut === 'recours' && issue === 'confirmee' && c.sanction === 'exclusion') await exclure(req.payload, m, c.numero, req)
  return { issue: issue || 'classee', dateCloture: new Date().toISOString() }
})

async function exclure(payload: Payload, m: { id: number; entreprise?: number | null }, numero: string, req?: PayloadRequest) {
  await payload.update({
    collection: 'members',
    id: m.id,
    overrideAccess: true,
    req,
    context: { sansMotif: true },
    data: { statut: 'ancien', motifStatut: `Exclusion (dossier ${numero})`, suspenduJusquau: null, fin: { type: 'exclusion', date: new Date().toISOString() } } as never,
  })
  if (m.entreprise) await payload.update({ collection: 'companies', id: m.entreprise, overrideAccess: true, req, data: { masqueeParAdmin: true, selectionAccueil: false } as never })
}

/**
 * Procédures disciplinaires (statuts, article 15). Chaque étape passe par son endpoint, qui refuse tout ce qui sort de l'ordre :
 * pas de sanction sans griefs notifiés, délai de défense de 15 jours et avis de la commission Éthique et Vérification.
 */
export const DisciplinaryCases: CollectionConfig = {
  slug: 'disciplinaryCases',
  labels: { singular: 'Procédure disciplinaire', plural: 'Procédures disciplinaires' },
  admin: { group: 'Adhésions', hidden: true, useAsTitle: 'numero' },
  defaultSort: '-createdAt',
  endpoints: [griefs, defense, avis, decision, recours, clore],
  access: {
    // Discipline (docs/04-roles-et-droits.md) : accès complet super admin et admin, lecture responsable membres.
    read: ({ req }) => extraRead(req.user, 'discipline'),
    create: ({ req }) => extraFull(req.user, 'discipline'),
    // Les étapes passent par les endpoints ; l'édition directe est limitée aux champs de préparation (hook ci-dessous).
    update: ({ req }) => extraFull(req.user, 'discipline'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create') {
          const annee = new Date().getFullYear()
          data.numero = `D-${annee}-${String(await prochainNumero(req.payload, `discipline-${annee}`, req)).padStart(3, '0')}`
          data.statut = 'ouverte'
          data.historique = [{ date: new Date().toISOString(), etape: 'ouverte', auteur: (req.user as { name?: string } | null)?.name ?? '' }]
          return data
        }
        if (req.context?.etape) return data
        // Hors des étapes : seuls les champs de préparation se modifient, et seulement avant la notification des griefs.
        if (originalDoc?.statut !== 'ouverte') {
          const libres = ['pieces']
          return { ...originalDoc, ...Object.fromEntries(Object.entries(data).filter(([k]) => libres.includes(k))) }
        }
        return { ...data, statut: 'ouverte' }
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'numero', label: 'Dossier', type: 'text', index: true, admin: { readOnly: true } },
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', required: true, index: true },
        { name: 'statut', label: 'Étape', type: 'select', defaultValue: 'ouverte', options: [...ETAPES], admin: { readOnly: true } },
      ],
    },
    { name: 'griefs', label: 'Griefs', type: 'select', hasMany: true, options: [...GRIEFS] },
    { name: 'faits', label: 'Faits', type: 'textarea' },
    { name: 'pieces', label: 'Pièces du dossier', type: 'upload', relationTo: 'fichiers', hasMany: true },
    { name: 'sanctionEnvisagee', label: 'Sanction envisagée', type: 'select', options: [...SANCTIONS] },
    {
      type: 'row',
      fields: [
        { name: 'dateGriefs', label: 'Griefs notifiés le', type: 'date', admin: { readOnly: true } },
        { name: 'finDefense', label: 'Fin du délai de défense', type: 'date', admin: { readOnly: true } },
        { name: 'dateDefense', label: 'Défense reçue le', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'defense', label: 'Défense du membre', type: 'textarea', admin: { readOnly: true } },
    { name: 'dateAvis', label: 'Avis rendu le', type: 'date', admin: { readOnly: true } },
    { name: 'avis', label: 'Avis de la commission Éthique et Vérification', type: 'textarea', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'sanction', label: 'Sanction prononcée', type: 'select', options: [...SANCTIONS], admin: { readOnly: true } },
        { name: 'dureeMois', label: 'Durée (mois)', type: 'number', admin: { readOnly: true } },
        { name: 'dateDecision', label: 'Décision le', type: 'date', admin: { readOnly: true } },
        { name: 'finRecours', label: 'Fin du délai de recours', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'motivation', label: 'Décision motivée', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'recours',
      label: 'Recours',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'date', label: 'Formé le', type: 'date' },
        { name: 'texte', label: 'Objet', type: 'textarea' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'issue', label: 'Issue', type: 'text', admin: { readOnly: true } },
        { name: 'dateCloture', label: 'Close le', type: 'date', admin: { readOnly: true } },
        { name: 'exclusionAppliquee', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
      ],
    },
    {
      name: 'historique',
      label: 'Historique',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        { name: 'date', type: 'date' },
        { name: 'etape', type: 'text' },
        { name: 'auteur', type: 'text' },
      ],
    },
  ],
}

export { exclure }
