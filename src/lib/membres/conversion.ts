import { randomBytes } from 'crypto'
import { APIError, type Payload, type PayloadRequest } from 'payload'

import { notify } from '@/emails/send'
import { categorie, montants, type Tarifs } from '@/lib/adhesion/categories'
import { logAction } from '@/lib/audit'
import { prochainNumero } from '@/lib/compteurs'
import { creerEcheance, recalculerTranches } from '@/lib/cotisations/service'
import { finExercice, limiteCotisation, numeroAdherent } from './options'
import { nouveauJeton } from './session'

const ACTIVATION_MS = 72 * 3600 * 1000

type Candidature = {
  id: number
  statut?: string
  pieceVerifiee?: boolean
  charteSignee?: boolean
  civilite?: string
  fonction?: string
  nom: string
  prenom: string
  telephone: string
  email: string
  trancheAge?: string
  raisonSociale: string
  formeJuridique?: string
  rccm?: string
  effectif?: string
  localite?: number | { id: number }
  quartier?: string
  description?: string
  services?: string
  secteurs?: (number | { id: number })[]
  categorie: string
  modalite?: string
  autorisations?: { annuaire?: boolean; coordonnees?: boolean; logo?: boolean; portrait?: boolean }
  membre?: number | { id: number } | null
}

const id = (x?: number | { id: number } | null) => (x == null ? undefined : typeof x === 'number' ? x : x.id)

/** Envoie (ou renvoie) le lien d'activation de 72 h avec l'e-mail de bienvenue (modèle 4). */
export async function envoyerActivation(payload: Payload, membreId: number, req?: PayloadRequest) {
  const m = (await payload.findByID({ collection: 'members', id: membreId, depth: 0, overrideAccess: true, req })) as unknown as {
    email: string
    prenom?: string
    numeroAdherent?: string
  }
  const { jeton, empreinte } = nouveauJeton()
  await payload.db.updateOne({
    collection: 'members',
    id: membreId,
    data: { activationHash: empreinte, activationExpire: new Date(Date.now() + ACTIVATION_MS).toISOString() },
    req,
    returning: false,
  })
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true, req })) as { whatsapp?: { lienGroupe?: string } }
  await notify(payload, {
    to: m.email,
    template: 'bienvenueActivation',
    vars: {
      prenom: m.prenom,
      numero_adherent: m.numeroAdherent,
      lien_activation: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/activation/${jeton}`,
      lien_groupe: s.whatsapp?.lienGroupe,
    },
  })
  return jeton
}

/**
 * « Convertir en membre » (docs/05-regles-metier.md §3) : fiche entreprise, compte membre, numéro REC-AAAA-NNNN,
 * montants de l'exercice copiés depuis les tarifs, paiements rattachés, lien d'activation et e-mail de bienvenue.
 */
export async function convertirCandidature(payload: Payload, candidatureId: number, req: PayloadRequest) {
  const c = (await payload.findByID({ collection: 'applications', id: candidatureId, depth: 0, overrideAccess: true, req })) as unknown as Candidature
  if (c.statut !== 'acceptee') throw new APIError('Le dossier doit être au statut « Acceptée ».', 400, null, true)
  if (!c.pieceVerifiee || !c.charteSignee) throw new APIError('Pièce d’identité vérifiée et charte signée sont nécessaires.', 400, null, true)
  if (c.membre) throw new APIError('Ce dossier a déjà été converti.', 400, null, true)
  const deja = await payload.count({
    collection: 'members',
    where: { and: [{ or: [{ email: { equals: c.email } }, { telephone: { equals: c.telephone } }] }, { statut: { not_equals: 'ancien' } }] },
    overrideAccess: true,
    req,
  })
  if (deja.totalDocs) throw new APIError('Un membre existe déjà avec cet e-mail ou ce téléphone.', 409, null, true)

  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true, req })) as { tarifs?: Tarifs }
  const cat = categorie(c.categorie)
  const m = montants(cat, s.tarifs)
  const debut = new Date()
  const annee = debut.getFullYear()
  const numero = numeroAdherent(annee, await prochainNumero(payload, `adherent-${annee}`, req))
  const a = c.autorisations ?? {}

  const entreprise = await payload.create({
    collection: 'companies',
    overrideAccess: true,
    req,
    data: {
      nom: c.raisonSociale,
      secteurs: (c.secteurs ?? []).map(id),
      localite: id(c.localite),
      quartier: c.quartier,
      effectif: c.effectif,
      formeJuridique: c.formeJuridique,
      rccm: c.rccm,
      presentation: c.description,
      services: c.services,
      visibilite: { annuaire: Boolean(a.annuaire), telephone: Boolean(a.coordonnees), whatsapp: Boolean(a.coordonnees), email: Boolean(a.coordonnees), miseEnAvant: false },
    } as never,
  })
  const membre = await payload.create({
    collection: 'members',
    overrideAccess: true,
    req,
    data: {
      email: c.email,
      // Mot de passe aléatoire jamais communiqué : le membre choisit le sien avec le lien d'activation.
      password: randomBytes(24).toString('base64url'),
      civilite: c.civilite,
      prenom: c.prenom,
      nom: c.nom,
      fonction: c.fonction,
      telephone: c.telephone,
      whatsapp: c.telephone,
      trancheAge: c.trancheAge,
      entreprise: entreprise.id,
      categorie: c.categorie,
      numeroAdherent: numero,
      statut: 'attente',
      dateAdhesion: debut.toISOString(),
      validiteCarte: finExercice(debut).toISOString(),
      dateLimiteCotisation: limiteCotisation(debut, s.tarifs?.delaiMois ?? 3).toISOString(),
      cotisation: m ? { droit: m.droit, montant: m.cotisation, tranches: s.tarifs?.tranchesMax ?? 2 } : undefined,
      candidature: c.id,
      consentementAnnuaire: a.annuaire ? debut.toISOString() : undefined,
    } as never,
  })
  await payload.update({ collection: 'companies', id: entreprise.id, data: { titulaire: membre.id } as never, overrideAccess: true, req })
  // Échéance de l'exercice (lot 11) ; les paiements de la candidature y sont rattachés.
  const echeance = await creerEcheance(payload, membre.id as number, debut, true, req)
  const paiements = await payload.find({ collection: 'payments', where: { candidature: { equals: c.id } }, overrideAccess: true, depth: 0, req })
  for (const p of paiements.docs)
    await payload.db.updateOne({ collection: 'payments', id: p.id, data: { membre: membre.id, ...(echeance ? { echeance } : {}) }, req, returning: false })
  if (echeance) await recalculerTranches(payload, echeance, req)
  await payload.update({
    collection: 'applications',
    id: c.id,
    data: { statut: 'active', membre: membre.id } as never,
    overrideAccess: true,
    req,
    context: { conversion: true },
  })
  await envoyerActivation(payload, membre.id as number, req)
  await logAction(payload, { req, categorie: 'validation', action: `Candidature convertie en membre ${numero}`, cible: numero })
  return membre
}
