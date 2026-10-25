'use server'
import { cookies, headers } from 'next/headers'

import { autoriserEnvoi, CHAMP_PIEGE, ipDe, jetonValide } from '@/lib/antispam'
import {
  categorie,
  emailNormalise,
  MESSAGE_DOUBLON,
  MESSAGE_SECTEURS,
  montants,
  SECTEURS_MAX,
  telephoneInternational,
  type Tarifs,
} from '@/lib/adhesion/categories'
import { existeDoublon } from '@/lib/adhesion/doublon'
import { COOKIE_MERCI, jetonMerci } from '@/lib/adhesion/merci'
import {
  AGES,
  ANCIENNETES,
  CIVILITES,
  CONNU_PAR,
  EFFECTIFS,
  FORMES,
  OBJECTIFS,
} from '@/lib/adhesion/options'
import { numeroDossierCandidat } from '@/lib/compteurs'
import { lancerPaiementMobile } from '@/lib/paiements/service'
import { getPayloadClient } from '@/lib/site/payload'

const HEURE = 3600 * 1000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TAILLE_MAX = 5 * 1024 * 1024
const prod = process.env.NODE_ENV === 'production'

export type Donnees = {
  civilite?: string
  fonction?: string
  nom?: string
  prenom?: string
  telephone?: string
  email?: string
  trancheAge?: string
  pieceIdentite?: string
  raisonSociale?: string
  formeJuridique?: string
  rccm?: string
  anneeCreation?: string
  effectif?: string
  localite?: number
  quartier?: string
  description?: string
  services?: string
  secteurs?: number[]
  anciennete?: string
  objectifs?: string[]
  connuPar?: string
  parrain?: string
  categorie?: string
  modalite?: string
  modePaiement?: string
  operateur?: string
  numeroPayeur?: string
  autorisations?: Record<string, boolean>
  consentement?: boolean
  acceptationTextes?: boolean
}

export type Erreurs = Record<string, string>

const dans = (liste: { value: string }[], v?: string) =>
  Boolean(v && liste.some((o) => o.value === v))

/** Contrôles de chaque étape (repris côté serveur : rien ne dépend seulement de l'interface). */
export async function erreursEtape(d: Donnees, etape: number): Promise<Erreurs> {
  const e: Erreurs = {}
  if (etape === 1) {
    if (!d.nom?.trim()) e.nom = 'Indiquez votre nom.'
    if (!d.prenom?.trim()) e.prenom = 'Indiquez votre prénom.'
    const tel = telephoneInternational(d.telephone)
    if (!tel || tel.replace(/\D/g, '').length < 9)
      e.telephone = 'Indiquez un numéro de téléphone valide.'
    if (!EMAIL.test(emailNormalise(d.email))) e.email = 'Indiquez une adresse e-mail valide.'
    if (!dans(AGES, d.trancheAge)) e.trancheAge = 'Choisissez votre tranche d’âge.'
    if (d.civilite && !dans(CIVILITES, d.civilite)) e.civilite = 'Choisissez une civilité.'
  }
  if (etape === 2) {
    if (!d.raisonSociale?.trim())
      e.raisonSociale = 'Indiquez la raison sociale ou le nom du projet.'
    if (!d.localite) e.localite = 'Choisissez votre localisation.'
    if (!d.description?.trim()) e.description = 'Décrivez votre activité ou votre projet.'
    if (d.formeJuridique && !dans(FORMES, d.formeJuridique))
      e.formeJuridique = 'Choisissez une forme juridique.'
    if (d.effectif && !dans(EFFECTIFS, d.effectif))
      e.effectif = 'Choisissez une tranche d’effectif.'
    if (!d.secteurs?.length) e.secteurs = 'Choisissez au moins un secteur.'
    else if (d.secteurs.length > SECTEURS_MAX) e.secteurs = MESSAGE_SECTEURS
  }
  if (etape === 3) {
    if (!dans(ANCIENNETES, d.anciennete)) e.anciennete = 'Indiquez votre ancienneté.'
    if (!d.objectifs?.length || !d.objectifs.every((o) => dans(OBJECTIFS, o)))
      e.objectifs = 'Cochez au moins un objectif.'
    if (d.connuPar && !dans(CONNU_PAR, d.connuPar)) e.connuPar = 'Choisissez une réponse.'
    if (!categorie(d.categorie)) e.categorie = 'Choisissez votre catégorie.'
  }
  if (etape === 4 && !categorie(d.categorie)?.convention) {
    if (!['une-fois', 'deux-tranches'].includes(d.modalite ?? ''))
      e.modalite = 'Choisissez de payer en une fois ou en deux tranches.'
    if (!['mobile', 'siege'].includes(d.modePaiement ?? ''))
      e.modePaiement = 'Choisissez un mode de paiement.'
    if (d.modePaiement === 'mobile') {
      if (!['mtn', 'airtel'].includes(d.operateur ?? ''))
        e.operateur = 'Choisissez votre opérateur.'
      const n = telephoneInternational(d.numeroPayeur)
      if (!n || n.replace(/\D/g, '').length < 9) e.numeroPayeur = 'Indiquez le numéro qui va payer.'
    }
  }
  if (etape === 5) {
    if (!d.consentement || !d.acceptationTextes)
      e.consentement = 'Cochez les deux cases pour envoyer votre candidature.'
  }
  return e
}

/** Étape 1 : contrôle de doublon côté serveur, limité à 10 essais par heure et par appareil. */
export async function verifierEtape1(
  d: Donnees,
): Promise<{ erreurs?: Erreurs; doublon?: boolean; limite?: boolean }> {
  const erreurs = await erreursEtape(d, 1)
  if (Object.keys(erreurs).length) return { erreurs }
  if (!autoriserEnvoi(`doublon:${ipDe(await headers())}`, 10, HEURE)) return { limite: true }
  const payload = await getPayloadClient()
  return { doublon: await existeDoublon(payload, d) }
}

export type Resultat = {
  ok?: boolean
  erreurs?: Erreurs
  etape?: number
  doublon?: boolean
  general?: string
}

/** Envoi final : tous les contrôles, pièces jointes, enregistrement, paiement mobile éventuel, accès à la page Merci. */
export async function envoyerCandidature(f: FormData): Promise<Resultat> {
  if (String(f.get(CHAMP_PIEGE) ?? '')) return { ok: true }
  if (!jetonValide(f.get('jeton')))
    return {
      general:
        'Le formulaire a expiré. Rechargez la page : votre brouillon est conservé sur cet appareil.',
    }
  if (!autoriserEnvoi(`candidature:${ipDe(await headers())}`, prod ? 5 : 50, HEURE))
    return {
      general:
        'Trop d’envois depuis cet appareil. Réessayez dans une heure ou écrivez-nous sur WhatsApp.',
    }
  let d: Donnees
  try {
    d = JSON.parse(String(f.get('donnees') ?? '{}')) as Donnees
  } catch {
    return { general: 'Formulaire illisible. Rechargez la page.' }
  }
  for (const etape of [1, 2, 3, 4, 5]) {
    const erreurs = await erreursEtape(d, etape)
    if (Object.keys(erreurs).length) return { erreurs, etape }
  }
  const fichiers = f
    .getAll('pieces')
    .filter((x): x is File => typeof x === 'object' && 'size' in x && x.size > 0)
  if (fichiers.length > 5) return { erreurs: { pieces: 'Cinq fichiers au maximum.' }, etape: 5 }
  for (const x of fichiers) {
    if (x.size > TAILLE_MAX) return { erreurs: { pieces: `« ${x.name} » dépasse 5 Mo.` }, etape: 5 }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(x.type))
      return { erreurs: { pieces: `« ${x.name} » : PDF, JPG ou PNG seulement.` }, etape: 5 }
  }

  const payload = await getPayloadClient()
  if (await existeDoublon(payload, d)) return { doublon: true, etape: 1 }
  const cat = categorie(d.categorie)!
  const pieces: number[] = []
  for (const x of fichiers) {
    const p = await payload.create({
      collection: 'pieces',
      overrideAccess: true,
      data: { type: 'justificatif' },
      file: {
        data: Buffer.from(await x.arrayBuffer()),
        mimetype: x.type,
        name: x.name,
        size: x.size,
      },
    })
    pieces.push(p.id as number)
  }
  let doc: { id: number; numero?: number; createdAt?: string }
  try {
    doc = (await payload.create({
      collection: 'applications',
      overrideAccess: true,
      data: {
        source: 'en-ligne',
        civilite: d.civilite,
        fonction: d.fonction,
        nom: d.nom!.trim(),
        prenom: d.prenom!.trim(),
        telephone: d.telephone,
        email: d.email,
        trancheAge: d.trancheAge,
        pieceIdentite: d.pieceIdentite,
        raisonSociale: d.raisonSociale!.trim(),
        formeJuridique: d.formeJuridique,
        rccm: d.rccm,
        anneeCreation: d.anneeCreation,
        effectif: d.effectif,
        localite: d.localite,
        quartier: d.quartier,
        description: d.description,
        services: d.services,
        secteurs: d.secteurs,
        anciennete: d.anciennete,
        objectifs: d.objectifs,
        connuPar: d.connuPar,
        parrain: d.parrain,
        categorie: cat.valeur,
        modalite: cat.convention ? undefined : d.modalite,
        modePaiement: cat.convention ? undefined : d.modePaiement,
        operateur: cat.convention || d.modePaiement !== 'mobile' ? undefined : d.operateur,
        numeroPayeur:
          cat.convention || d.modePaiement !== 'mobile'
            ? undefined
            : telephoneInternational(d.numeroPayeur),
        pieces,
        autorisations: d.autorisations,
        consentement: true,
        acceptationTextes: true,
      } as never,
    })) as unknown as { id: number; numero?: number; createdAt?: string }
  } catch (err) {
    const message = (err as Error).message
    if (message === MESSAGE_DOUBLON) return { doublon: true, etape: 1 }
    payload.logger.error({ err }, 'Candidature : enregistrement impossible')
    return {
      general:
        'Votre candidature n’a pas pu être enregistrée. Réessayez dans un instant ou écrivez-nous sur WhatsApp.',
    }
  }

  if (!cat.convention && d.modePaiement === 'mobile') {
    const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as {
      tarifs?: Tarifs
    }
    const m = montants(cat, s.tarifs)
    if (m) {
      const deux = d.modalite === 'deux-tranches'
      await lancerPaiementMobile(payload, {
        candidature: doc.id,
        operateur: d.operateur as 'mtn' | 'airtel',
        telephone: telephoneInternational(d.numeroPayeur),
        montant: deux ? m.premierVersement : m.total,
        objet: deux ? 'adhesion-tranche' : 'adhesion',
        libelle: `Adhésion REC 242, dossier ${numeroDossierCandidat(doc.numero, doc.createdAt)}`,
        reference: numeroDossierCandidat(doc.numero, doc.createdAt),
      })
    }
  }

  ;(await cookies()).set(COOKIE_MERCI, jetonMerci(doc.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: prod,
    maxAge: 30 * 60,
    path: '/',
  })
  return { ok: true }
}
