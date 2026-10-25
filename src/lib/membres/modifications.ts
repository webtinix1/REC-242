import { APIError, type Payload, type PayloadRequest } from 'payload'

import { emailNormalise, telephoneInternational, telephoneAffiche, MESSAGE_SECTEURS, SECTEURS_MAX } from '@/lib/adhesion/categories'
import type { ChampVerifie } from './options'

type Membre = {
  id: number
  prenom?: string
  nom?: string
  telephone?: string
  email?: string
  entreprise?: number | { id: number } | null
}
type Entreprise = {
  id: number
  nom?: string
  quartier?: string
  secteurs?: (number | { id: number; nom?: string })[]
  localite?: number | { id: number; nom?: string } | null
}

const idDe = (x?: number | { id: number } | null) => (x == null ? undefined : typeof x === 'number' ? x : x.id)

const charger = async (payload: Payload, membreId: number, req?: PayloadRequest) => {
  const m = (await payload.findByID({ collection: 'members', id: membreId, depth: 0, overrideAccess: true, req })) as unknown as Membre
  const eid = idDe(m.entreprise)
  const e = eid ? ((await payload.findByID({ collection: 'companies', id: eid, depth: 1, overrideAccess: true, req })) as unknown as Entreprise) : null
  return { m, e }
}

/** Valeur actuelle d'un champ vérifié, telle qu'affichée au membre (écran 03). */
export async function valeurActuelle(payload: Payload, membreId: number, champ: ChampVerifie, req?: PayloadRequest): Promise<string> {
  const { m, e } = await charger(payload, membreId, req)
  switch (champ) {
    case 'nom':
      return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim()
    case 'raisonSociale':
      return e?.nom ?? ''
    case 'secteurs':
      return (e?.secteurs ?? []).map((s) => (typeof s === 'object' ? s.nom : '')).filter(Boolean).join(', ')
    case 'villeQuartier':
      return [typeof e?.localite === 'object' ? e?.localite?.nom : '', e?.quartier].filter(Boolean).join(', ')
    case 'telephone':
      return telephoneAffiche(m.telephone)
    case 'email':
      return m.email ?? ''
  }
}

/** Applique une demande validée à la fiche du membre ou de son entreprise. Lève une erreur claire si la valeur est inutilisable. */
export async function appliquerModification(
  payload: Payload,
  d: { membre: number; champ: ChampVerifie; nouvelleValeur: string },
  req?: PayloadRequest,
): Promise<void> {
  const { m, e } = await charger(payload, d.membre, req)
  const v = d.nouvelleValeur.trim()
  const majMembre = (data: Record<string, unknown>) =>
    payload.update({ collection: 'members', id: m.id, data: data as never, overrideAccess: true, req, context: { sansMotif: true } })
  const majEntreprise = (data: Record<string, unknown>) => {
    if (!e) throw new APIError('Ce membre n’a pas de fiche entreprise.', 400, null, true)
    return payload.update({ collection: 'companies', id: e.id, data: data as never, overrideAccess: true, req })
  }
  switch (d.champ) {
    case 'nom': {
      const mots = v.split(/\s+/)
      if (mots.length < 2) throw new APIError('Indiquez le prénom puis le nom.', 400, null, true)
      await majMembre({ prenom: mots.slice(0, -1).join(' '), nom: mots[mots.length - 1] })
      return
    }
    case 'raisonSociale':
      await majEntreprise({ nom: v })
      return
    case 'secteurs': {
      const noms = v.split(/[,;]/).map((x) => x.trim()).filter(Boolean)
      if (!noms.length) throw new APIError('Indiquez au moins un secteur.', 400, null, true)
      if (noms.length > SECTEURS_MAX) throw new APIError(MESSAGE_SECTEURS, 400, null, true)
      const tous = await payload.find({ collection: 'sectors', limit: 100, depth: 0, overrideAccess: true, req })
      const ids = noms.map((n) => tous.docs.find((s) => (s as unknown as { nom: string }).nom.toLowerCase() === n.toLowerCase())?.id)
      if (ids.some((x) => !x)) throw new APIError('Secteur inconnu : utilisez les noms de la liste des secteurs.', 400, null, true)
      await majEntreprise({ secteurs: ids })
      return
    }
    case 'villeQuartier': {
      const [ville, ...reste] = v.split(',').map((x) => x.trim())
      const loc = await payload.find({ collection: 'localities', where: { nom: { equals: ville } }, limit: 1, depth: 0, overrideAccess: true, req })
      if (!loc.docs[0]) throw new APIError('Ville inconnue : utilisez une ville de la liste des localités.', 400, null, true)
      await majEntreprise({ localite: loc.docs[0].id, quartier: reste.join(', ') })
      return
    }
    case 'telephone': {
      const t = telephoneInternational(v)
      if (t.replace(/\D/g, '').length < 9) throw new APIError('Numéro de téléphone invalide.', 400, null, true)
      await majMembre({ telephone: t })
      return
    }
    case 'email': {
      const em = emailNormalise(v)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new APIError('Adresse e-mail invalide.', 400, null, true)
      const pris = await payload.count({ collection: 'members', where: { and: [{ email: { equals: em } }, { id: { not_equals: m.id } }] }, overrideAccess: true, req })
      if (pris.totalDocs) throw new APIError('Cette adresse est déjà utilisée par un autre compte.', 400, null, true)
      await majMembre({ email: em })
      return
    }
  }
}
