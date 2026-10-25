'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import { logAction } from '@/lib/audit'
import { membreConnecte, type Membre } from '@/lib/membres/espace'
import { CHAMPS_VERIFIES, NOTIFICATIONS, VISIBILITES } from '@/lib/membres/options'
import { fermerSessions } from '@/lib/membres/session'
import { getPayloadClient } from '@/lib/site/payload'

export type Retour = { ok?: string; erreur?: string; erreurs?: Record<string, string> }

const exiger = async (): Promise<{ m: Membre; user: { id: number; collection: 'members'; _sid?: string } }> => {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') throw new Error('Session expirée : reconnectez-vous.')
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return { m, user: user as unknown as { id: number; collection: 'members'; _sid?: string } }
}

const limiter = async (usage: string, max: number) =>
  autoriserEnvoi(`${usage}:${ipDe(await headers())}`, process.env.NODE_ENV === 'production' ? max : max * 10, 3600 * 1000)

const url = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

/** « Ce que vous modifiez vous-même » : la présentation part en relecture, le reste est publié tout de suite. */
export async function enregistrerFiche(_: Retour, f: FormData): Promise<Retour> {
  const { m, user } = await exiger()
  if (!m.entreprise) return { erreur: 'Aucune fiche entreprise n’est rattachée à votre compte.' }
  const payload = await getPayloadClient()
  const presentation = String(f.get('presentation') ?? '').trim()
  const erreurs: Record<string, string> = {}
  const liens = { siteWeb: url(f.get('siteWeb')), linkedin: url(f.get('linkedin')), facebook: url(f.get('facebook')) }
  for (const [k, v] of Object.entries(liens)) if (v && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v)) erreurs[k] = 'Adresse invalide.'
  if (presentation.length > 1200) erreurs.presentation = '1 200 caractères au maximum.'
  if (Object.keys(erreurs).length) return { erreurs }
  const actuelle = m.entreprise.presentationProposee ?? m.entreprise.presentation ?? ''
  await payload.update({
    collection: 'companies',
    id: m.entreprise.id,
    data: {
      ...(presentation !== actuelle ? { presentationProposee: presentation } : {}),
      services: String(f.get('services') ?? '').trim(),
      ...liens,
    } as never,
    overrideAccess: false,
    user,
  })
  revalidatePath('/espace-membre', 'layout')
  return { ok: 'Modifications enregistrées' }
}

/** Interrupteurs de visibilité (écran 03). Désactiver l'annuaire retire la fiche immédiatement. */
export async function changerVisibilite(nom: string, valeur: boolean): Promise<Retour> {
  const { m, user } = await exiger()
  if (!m.entreprise || !VISIBILITES.some((v) => v.name === nom)) return { erreur: 'Réglage inconnu.' }
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'companies',
    id: m.entreprise.id,
    data: { visibilite: { ...m.entreprise.visibilite, [nom]: valeur } } as never,
    overrideAccess: false,
    user,
  })
  if (nom === 'annuaire')
    await payload.update({
      collection: 'members',
      id: m.id,
      data: { consentementAnnuaire: valeur ? new Date().toISOString() : null } as never,
      overrideAccess: false,
      user,
    })
  revalidatePath('/espace-membre/profil')
  return { ok: valeur ? 'Activé' : 'Désactivé' }
}

export async function changerNotification(nom: string, valeur: boolean): Promise<Retour> {
  const { m, user } = await exiger()
  if (!NOTIFICATIONS.some((n) => n.name === nom)) return { erreur: 'Préférence inconnue.' }
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'members',
    id: m.id,
    data: { notifications: { ...m.notifications, [nom]: valeur } } as never,
    overrideAccess: false,
    user,
  })
  return { ok: 'Préférence enregistrée' }
}

/** Demande de modification d'un champ vérifié (crée une modificationRequest). */
export async function demanderModification(_: Retour, f: FormData): Promise<Retour> {
  const { user } = await exiger()
  if (!(await limiter('modification', 10))) return { erreur: 'Trop de demandes en une heure. Réessayez plus tard.' }
  const champ = String(f.get('champ') ?? '')
  const nouvelleValeur = String(f.get('nouvelleValeur') ?? '').trim()
  const erreurs: Record<string, string> = {}
  if (!CHAMPS_VERIFIES.some((c) => c.value === champ)) erreurs.champ = 'Choisissez le champ à modifier.'
  if (!nouvelleValeur) erreurs.nouvelleValeur = 'Indiquez la nouvelle valeur.'
  if (Object.keys(erreurs).length) return { erreurs }
  const payload = await getPayloadClient()
  let justificatif: number | undefined
  const fichier = f.get('justificatif')
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > 5 * 1024 * 1024) return { erreurs: { justificatif: '5 Mo au maximum.' } }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(fichier.type))
      return { erreurs: { justificatif: 'Formats acceptés : PDF, JPEG ou PNG.' } }
    const piece = await payload.create({
      collection: 'pieces',
      overrideAccess: true,
      data: { type: 'justificatif' } as never,
      file: { data: Buffer.from(await fichier.arrayBuffer()), mimetype: fichier.type, name: fichier.name, size: fichier.size },
    })
    justificatif = piece.id as number
  }
  try {
    await payload.create({
      collection: 'modificationRequests',
      data: { champ, nouvelleValeur, motif: String(f.get('motif') ?? '').trim(), justificatif } as never,
      overrideAccess: false,
      user,
    })
  } catch (e) {
    return { erreur: (e as Error).message }
  }
  revalidatePath('/espace-membre/profil')
  return { ok: 'Demande envoyée' }
}

/** Photo ou logo : recadrage carré, conversion WebP, remplacement de l'image précédente. */
export async function changerImage(_: Retour, f: FormData): Promise<Retour> {
  const { m, user } = await exiger()
  if (!(await limiter('image', 20))) return { erreur: 'Trop d’envois en une heure. Réessayez plus tard.' }
  const cible = f.get('cible') === 'logo' ? 'logo' : 'photo'
  const fichier = f.get('fichier')
  if (!(fichier instanceof File) || !fichier.size) return { erreur: 'Choisissez une image.' }
  if (fichier.size > 8 * 1024 * 1024) return { erreur: 'Image trop lourde : 8 Mo au maximum.' }
  if (!fichier.type.startsWith('image/')) return { erreur: 'Choisissez une image (JPEG, PNG ou WebP).' }
  let data: Buffer
  try {
    const img = sharp(Buffer.from(await fichier.arrayBuffer())).rotate()
    data =
      cible === 'photo'
        ? await img.resize(800, 800, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer()
        : await img.resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 85 }).toBuffer()
  } catch {
    return { erreur: 'Image illisible. Essayez avec un autre fichier.' }
  }
  const payload = await getPayloadClient()
  const base = (cible === 'photo' ? `${m.prenom}-${m.nom}` : (m.entreprise?.nom ?? 'logo'))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const media = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: cible === 'photo' ? `${m.prenom} ${m.nom}` : `Logo ${m.entreprise?.nom ?? ''}`.trim() } as never,
    file: { data, mimetype: 'image/webp', name: `${base}-${Date.now()}.webp`, size: data.length },
  })
  const ancien = cible === 'photo' ? m.photo : m.entreprise?.logo
  if (cible === 'photo') await payload.update({ collection: 'members', id: m.id, data: { photo: media.id } as never, overrideAccess: false, user })
  else if (m.entreprise)
    await payload.update({ collection: 'companies', id: m.entreprise.id, data: { logo: media.id } as never, overrideAccess: false, user })
  const ancienId = ancien && typeof ancien === 'object' ? (ancien as { id?: number }).id : typeof ancien === 'number' ? ancien : undefined
  if (ancienId) await payload.delete({ collection: 'media', id: ancienId, overrideAccess: true }).catch(() => null)
  revalidatePath('/espace-membre', 'layout')
  return { ok: cible === 'photo' ? 'Photo mise à jour' : 'Logo mis à jour' }
}

/** Changer le mot de passe : l'ancien est vérifié ; les autres appareils sont déconnectés. */
export async function changerMotDePasse(_: Retour, f: FormData): Promise<Retour> {
  const { m, user } = await exiger()
  if (!(await limiter('motdepasse', 10))) return { erreur: 'Trop d’essais en une heure. Réessayez plus tard.' }
  const ancien = String(f.get('ancien') ?? '')
  const nouveau = String(f.get('nouveau') ?? '')
  const erreurs: Record<string, string> = {}
  if (nouveau.length < 10) erreurs.nouveau = '10 caractères minimum.'
  else if (nouveau !== String(f.get('confirmation') ?? '')) erreurs.confirmation = 'Les deux mots de passe ne correspondent pas.'
  if (Object.keys(erreurs).length) return { erreurs }
  const payload = await getPayloadClient()
  try {
    // Vérification par la connexion de Payload : les essais ratés comptent dans le blocage après 5 essais.
    // La session ouverte au passage est fermée juste après avec les autres appareils.
    await payload.login({ collection: 'members', data: { email: m.email, password: ancien } })
  } catch {
    return { erreurs: { ancien: 'Mot de passe actuel incorrect.' } }
  }
  await payload.update({ collection: 'members', id: m.id, data: { password: nouveau } as never, overrideAccess: true, context: { parLeMembre: true } })
  if (user._sid) await fermerSessions(payload, m.id, user._sid)
  await logAction(payload, { categorie: 'connexion', action: 'Mot de passe changé depuis l’espace membre', cible: m.email, author: { type: 'membre', nom: `${m.prenom} ${m.nom}` } })
  return { ok: 'Mot de passe changé' }
}

/** « Me déconnecter de tous les appareils » : toutes les sessions sauf celle-ci. */
export async function deconnecterAppareils(): Promise<Retour> {
  const { m, user } = await exiger()
  const payload = await getPayloadClient()
  await fermerSessions(payload, m.id, user._sid)
  return { ok: 'Toutes vos sessions sont fermées, sauf celle-ci.' }
}

/** Demande de suppression du compte : vaut démission, traitée par le responsable membres (écran 06). */
export async function demanderSuppression(): Promise<Retour> {
  const { m } = await exiger()
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'members',
    id: m.id,
    data: { fin: { suppressionDemandee: new Date().toISOString() } } as never,
    overrideAccess: true,
    context: { sansMotif: true },
  })
  await logAction(payload, {
    categorie: 'validation',
    action: `Demande de suppression du compte (${m.numeroAdherent ?? ''})`,
    cible: m.numeroAdherent,
    author: { type: 'membre', nom: `${m.prenom} ${m.nom}` },
  })
  return { ok: 'Votre demande est transmise au responsable membres, qui vous contacte avant toute suppression.' }
}
