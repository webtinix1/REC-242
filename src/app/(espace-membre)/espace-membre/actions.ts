'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { notify } from '@/emails/send'
import { emailNormalise } from '@/lib/adhesion/categories'
import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import { logAction } from '@/lib/audit'
import { envoyerActivation } from '@/lib/membres/conversion'
import { membreConnecte } from '@/lib/membres/espace'
import {
  COOKIE_SESSION,
  DUREE_COURTE,
  DUREE_LONGUE,
  empreinte,
  nouveauJeton,
  optionsCookie,
  ouvrirSession,
  revoquerSession,
} from '@/lib/membres/session'
import { getPayloadClient } from '@/lib/site/payload'

export type EtatFormulaire = { erreur?: string; erreurs?: Record<string, string>; ok?: boolean }

const MIN = 10
const DEV = process.env.NODE_ENV !== 'production'

/** Retour après connexion : seulement une page de l'espace membre. */
const retourSur = (v: unknown) => {
  const s = String(v ?? '')
  return s.startsWith('/espace-membre') && !s.startsWith('//') && !s.startsWith('/espace-membre/connexion') ? s : '/espace-membre'
}

async function poserSession(token: string, rester: boolean) {
  const c = await cookies()
  c.set('payload-token', token, optionsCookie(rester ? DUREE_LONGUE : DUREE_COURTE))
  c.set(COOKIE_SESSION, rester ? 'long' : 'court', optionsCookie(DUREE_LONGUE))
}

const limite = async (usage: string, max: number) => {
  const ip = ipDe(await headers())
  return autoriserEnvoi(`${usage}:${ip}`, DEV ? max * 10 : max, 15 * 60 * 1000)
}

/** Connexion (écran 01). Les états « En attente » et « Suspendu » ont leur écran. */
export async function seConnecter(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const email = emailNormalise(String(f.get('email') ?? ''))
  const password = String(f.get('password') ?? '')
  const rester = f.get('rester') === 'on'
  const erreurs: Record<string, string> = {}
  if (!email) erreurs.email = 'Indiquez votre e-mail.'
  if (password.length < MIN) erreurs.password = '10 caractères minimum.'
  if (Object.keys(erreurs).length) return { erreurs }
  if (!(await limite('connexion', 20))) return { erreur: 'Trop de tentatives depuis cet appareil. Réessayez dans 15 minutes.' }

  const payload = await getPayloadClient()
  let etat: string | null = null
  try {
    const r = await payload.login({ collection: 'members', data: { email, password } })
    if (r.token) await poserSession(r.token, rester)
  } catch (e) {
    const err = e as { name?: string; message?: string }
    if (err.message === 'COMPTE_SUSPENDU') etat = 'suspendu'
    else if (err.message === 'COMPTE_EN_ATTENTE') etat = 'attente'
    else if (err.name === 'LockedAuth')
      return { erreur: 'Après 5 essais, le compte est bloqué pendant 15 minutes. Réessayez plus tard ou choisissez « Mot de passe oublié ? ».' }
    else {
      // Candidature encore en cours d'examen pour cette adresse : l'écran « En attente » l'explique.
      const enCours = await payload.count({
        collection: 'applications',
        where: { and: [{ email: { equals: email } }, { statut: { in: ['recue', 'en-examen', 'complement', 'acceptee'] } }] },
        overrideAccess: true,
      })
      const membre = await payload.count({ collection: 'members', where: { email: { equals: email } }, overrideAccess: true })
      if (enCours.totalDocs && !membre.totalDocs) etat = 'attente'
      else return { erreur: 'E-mail ou mot de passe incorrect.' }
    }
  }
  if (etat) redirect(`/espace-membre/connexion?etat=${etat}`)
  redirect(retourSur(f.get('retour')))
}

/** Mot de passe oublié : lien valable 1 heure ; même réponse que l'adresse existe ou non. */
export async function motDePasseOublie(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const email = emailNormalise(String(f.get('email') ?? ''))
  if (!email) return { erreurs: { email: 'Indiquez votre e-mail.' } }
  if (await limite('oubli', 5)) {
    const payload = await getPayloadClient()
    await payload.forgotPassword({ collection: 'members', data: { email } }).catch(() => null)
  }
  return { ok: true }
}

/** Lien de connexion unique, valable 15 minutes (membres actifs seulement ; même réponse dans tous les cas). */
export async function recevoirLien(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const email = emailNormalise(String(f.get('email') ?? ''))
  if (!email) return { erreurs: { email: 'Indiquez votre e-mail.' } }
  if (await limite('lien', 5)) {
    const payload = await getPayloadClient()
    const r = await payload.find({ collection: 'members', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
    const m = r.docs[0] as unknown as { id: number; statut: string; email: string } | undefined
    if (m?.statut === 'actif') {
      const { jeton, empreinte: h } = nouveauJeton()
      await payload.db.updateOne({
        collection: 'members',
        id: m.id,
        data: { lienHash: h, lienExpire: new Date(Date.now() + 15 * 60 * 1000).toISOString() },
        returning: false,
      })
      await notify(payload, {
        to: m.email,
        template: 'lienConnexion',
        vars: { lien: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/lien/${jeton}` },
      })
    }
  }
  return { ok: true }
}

type MembreJeton = { id: number; statut: string; email: string; activationExpire?: string; entreprise?: number | null }

const parActivation = async (jeton: string) => {
  const payload = await getPayloadClient()
  const r = await payload.db.findOne({ collection: 'members', where: { activationHash: { equals: empreinte(jeton) } } })
  return r as unknown as MembreJeton | null
}

/** Activation (lien de 72 h) : choix du mot de passe, consentement à l'annuaire, conditions d'utilisation. */
export async function activer(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const jeton = String(f.get('jeton') ?? '')
  const password = String(f.get('password') ?? '')
  const confirmation = String(f.get('confirmation') ?? '')
  const annuaire = f.get('annuaire') === 'on'
  const erreurs: Record<string, string> = {}
  if (password.length < MIN) erreurs.password = '10 caractères minimum.'
  else if (password !== confirmation) erreurs.confirmation = 'Les deux mots de passe ne correspondent pas.'
  if (f.get('conditions') !== 'on') erreurs.conditions = 'Acceptez les conditions d’utilisation pour activer votre espace.'
  if (Object.keys(erreurs).length) return { erreurs }

  const m = await parActivation(jeton)
  if (!m || !m.activationExpire || new Date(m.activationExpire) < new Date() || m.statut !== 'attente')
    return { erreur: 'Ce lien n’est plus valable.' }
  const payload = await getPayloadClient()
  const maintenant = new Date().toISOString()
  await payload.update({
    collection: 'members',
    id: m.id,
    data: { password, statut: 'actif', conditionsAcceptees: maintenant, consentementAnnuaire: annuaire ? maintenant : null } as never,
    overrideAccess: true,
    context: { sansMotif: true, parLeMembre: true },
  })
  await payload.db.updateOne({ collection: 'members', id: m.id, data: { activationHash: null, activationExpire: null }, returning: false })
  if (m.entreprise) {
    const e = (await payload.findByID({ collection: 'companies', id: m.entreprise, depth: 0, overrideAccess: true })) as unknown as {
      visibilite?: Record<string, boolean>
    }
    await payload.update({
      collection: 'companies',
      id: m.entreprise,
      data: { visibilite: { ...e.visibilite, annuaire } } as never,
      overrideAccess: true,
    })
  }
  await logAction(payload, { categorie: 'connexion', action: 'Espace membre activé', cible: m.email, author: { type: 'membre', nom: m.email } })
  const { token } = await ouvrirSession(payload, m.id)
  await poserSession(token, false)
  redirect('/espace-membre')
}

/** Lien d'activation expiré : un nouveau lien de 72 h est envoyé. */
export async function renvoyerActivation(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  if (!(await limite('activation', 3))) return { erreur: 'Trop de demandes depuis cet appareil. Réessayez dans 15 minutes.' }
  const m = await parActivation(String(f.get('jeton') ?? ''))
  if (m && m.statut === 'attente') await envoyerActivation(await getPayloadClient(), m.id)
  return { ok: true }
}

/** Nouveau mot de passe depuis le lien « Mot de passe oublié » (1 heure). */
export async function nouveauMotDePasse(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const token = String(f.get('jeton') ?? '')
  const password = String(f.get('password') ?? '')
  if (password.length < MIN) return { erreurs: { password: '10 caractères minimum.' } }
  if (password !== String(f.get('confirmation') ?? '')) return { erreurs: { confirmation: 'Les deux mots de passe ne correspondent pas.' } }
  const payload = await getPayloadClient()
  let membre: { id: number; statut?: string } | null = null
  try {
    const r = await payload.resetPassword({ collection: 'members', data: { token, password }, overrideAccess: true })
    membre = r.user as unknown as { id: number; statut?: string }
  } catch {
    return { erreur: 'Ce lien n’est plus valable. Demandez-en un nouveau depuis « Mot de passe oublié ? ».' }
  }
  if (membre.statut !== 'actif') redirect(`/espace-membre/connexion?etat=${membre.statut === 'attente' ? 'attente' : 'suspendu'}`)
  const { token: t } = await ouvrirSession(payload, membre.id)
  await poserSession(t, false)
  redirect('/espace-membre')
}

/** Déconnexion de cet appareil. */
export async function seDeconnecter() {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() }).catch(() => ({ user: null }))
  const u = user as { id: number; collection?: string; _sid?: string } | null
  if (u?.collection === 'members' && u._sid) await revoquerSession(payload, u.id, u._sid)
  const c = await cookies()
  c.delete('payload-token')
  c.delete(COOKIE_SESSION)
  redirect('/espace-membre/connexion')
}

/** Utilisé par les pages de connexion : un membre déjà connecté va directement à son tableau de bord. */
export async function dejaConnecte() {
  const m = await membreConnecte()
  return Boolean(m && m.statut === 'actif')
}
