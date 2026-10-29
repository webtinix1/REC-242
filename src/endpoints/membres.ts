import { APIError, type Endpoint, type PayloadRequest } from 'payload'

import { atLeast } from '@/access/roles'
import { categorie, emailNormalise, telephoneAffiche, telephoneInternational } from '@/lib/adhesion/categories'
import { archiveImprimeur } from '@/lib/annuaire/imprime'
import { logAction } from '@/lib/audit'
import { celluleCsv } from '@/lib/csv'
import { envoyerActivation } from '@/lib/membres/conversion'
import { STATUTS_MEMBRE } from '@/lib/membres/options'

const corps = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

const exiger = (req: PayloadRequest, niveau: 'read' | 'partial' | 'full' = 'partial') => {
  if (!atLeast(req.user, 'membres', niveau)) throw new APIError('Action non autorisée.', 403)
}

const membre = async (req: PayloadRequest) => {
  const id = req.routeParams?.id as string
  const m = await req.payload.findByID({ collection: 'members', id, depth: 0, overrideAccess: false, req }).catch(() => null)
  if (!m) throw new APIError('Membre introuvable.', 404)
  return m as unknown as { id: number; statut: string; numeroAdherent?: string; entreprise?: number | null; email: string; nomComplet?: string }
}

/** Écran 06 : changement de statut (Actif, Suspendu, Ancien membre), toujours avec un motif. */
const statut: Endpoint = {
  path: '/:id/statut',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const m = await membre(req)
    const b = await corps(req)
    const s = String(b.statut ?? '')
    const motif = String(b.motif ?? '').trim()
    if (!['actif', 'suspendu', 'ancien'].includes(s)) throw new APIError('Statut inconnu.', 400, null, true)
    if (!motif) throw new APIError('Indiquez le motif du changement de statut.', 400, null, true)
    if (s === 'actif' && m.statut === 'attente') throw new APIError('Le membre active lui-même son espace avec le lien reçu par e-mail.', 400, null, true)
    await req.payload.update({ collection: 'members', id: m.id, data: { statut: s, motifStatut: motif } as never, overrideAccess: false, req })
    // Un ancien membre quitte l'annuaire ; l'historique reste.
    if (s === 'ancien' && m.entreprise)
      await req.payload.update({ collection: 'companies', id: m.entreprise, data: { masqueeParAdmin: true } as never, overrideAccess: true, req })
    return Response.json({ ok: true, statut: STATUTS_MEMBRE.find((x) => x.value === s)?.label })
  },
}

/** Écran 06 : « Renvoyer le lien d'activation » (72 h). */
const activation: Endpoint = {
  path: '/:id/activation',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const m = await membre(req)
    if (m.statut !== 'attente') throw new APIError('Ce compte est déjà activé.', 400, null, true)
    await envoyerActivation(req.payload, m.id, req)
    await logAction(req.payload, { req, categorie: 'validation', action: 'Lien d’activation renvoyé', cible: m.numeroAdherent })
    return Response.json({ ok: true })
  },
}

/** Écran 06 : masquer ou réafficher la fiche (jamais la publier sans le consentement du membre). */
const masquer: Endpoint = {
  path: '/:id/masquer',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const m = await membre(req)
    if (!m.entreprise) throw new APIError('Aucune fiche entreprise.', 400, null, true)
    const masquee = Boolean((await corps(req)).masquee)
    await req.payload.update({ collection: 'companies', id: m.entreprise, data: { masqueeParAdmin: masquee } as never, overrideAccess: false, req })
    await logAction(req.payload, { req, categorie: 'validation', action: masquee ? 'Fiche masquée dans l’annuaire' : 'Fiche réaffichée dans l’annuaire', cible: m.numeroAdherent })
    return Response.json({ ok: true })
  },
}

/** Écran 06 : commissions du membre (modifiables par le responsable membres). */
const fiche: Endpoint = {
  path: '/:id/commissions',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const m = await membre(req)
    const ids = ((await corps(req)).commissions as unknown[] | undefined)?.map(Number).filter(Boolean) ?? []
    await req.payload.update({ collection: 'members', id: m.id, data: { commissions: ids } as never, overrideAccess: false, req, context: { sansMotif: true } })
    return Response.json({ ok: true })
  },
}

/** Écran 06 : rétablit les mises en relation suspendues après plus de 10 demandes en une semaine (vérification faite). */
const relations: Endpoint = {
  path: '/:id/relations',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const m = await membre(req)
    await req.payload.update({ collection: 'members', id: m.id, data: { relationsSuspendues: false } as never, overrideAccess: false, req, context: { sansMotif: true } })
    await logAction(req.payload, { req, categorie: 'validation', action: 'Mises en relation rétablies', cible: m.numeroAdherent })
    return Response.json({ ok: true })
  },
}

/** Écran 06 : fin d'adhésion (démission écrite, décès). La fiche quitte l'annuaire, l'historique est conservé. */
const fin: Endpoint = {
  path: '/:id/fin',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const m = await membre(req)
    const b = await corps(req)
    const type = String(b.type ?? '')
    if (!['demission', 'deces'].includes(type)) throw new APIError('Motif inconnu.', 400, null, true)
    const date = b.date ? new Date(String(b.date)) : new Date()
    if (Number.isNaN(date.getTime())) throw new APIError('Date invalide.', 400, null, true)
    const libelle = type === 'demission' ? 'Démission écrite' : 'Décès'
    await req.payload.update({
      collection: 'members',
      id: m.id,
      data: { statut: 'ancien', motifStatut: libelle, fin: { type, date: date.toISOString() } } as never,
      overrideAccess: false,
      req,
    })
    if (m.entreprise)
      await req.payload.update({ collection: 'companies', id: m.entreprise, data: { masqueeParAdmin: true, selectionAccueil: false } as never, overrideAccess: true, req })
    return Response.json({ ok: true })
  },
}

const COLONNES = ['numero_adherent', 'prenom', 'nom', 'email', 'telephone', 'categorie', 'entreprise', 'secteurs', 'ville', 'quartier', 'statut', 'date_adhesion']
// Cellule neutralisée : une valeur saisie « =… » ne devient pas une formule dans le tableur.
const esc = (v: unknown) => celluleCsv(v)

/** Écran 05 : export CSV des fiches (droit « Exports de données personnelles »), inscrit au journal. */
const exporter: Endpoint = {
  path: '/export',
  method: 'get',
  handler: async (req) => {
    exiger(req, 'read')
    if (!atLeast(req.user, 'exports', 'full')) throw new APIError('Export non autorisé pour votre rôle.', 403)
    const r = await req.payload.find({ collection: 'members', limit: 5000, depth: 2, overrideAccess: false, req, sort: 'numeroAdherent' })
    const lignes = r.docs.map((d) => {
      const m = d as unknown as Record<string, unknown> & {
        entreprise?: { nom?: string; quartier?: string; secteurs?: { nom?: string }[]; localite?: { nom?: string } } | null
      }
      return [
        m.numeroAdherent,
        m.prenom,
        m.nom,
        m.email,
        telephoneAffiche(m.telephone as string),
        m.categorie,
        m.entreprise?.nom,
        (m.entreprise?.secteurs ?? []).map((s) => s.nom).join(', '),
        m.entreprise?.localite?.nom,
        m.entreprise?.quartier,
        STATUTS_MEMBRE.find((s) => s.value === m.statut)?.label,
        m.dateAdhesion ? String(m.dateAdhesion).slice(0, 10) : '',
      ]
        .map(esc)
        .join(';')
    })
    await logAction(req.payload, { req, categorie: 'export', action: `A exporté ${r.docs.length} fiche(s) membre` })
    return new Response('﻿' + [COLONNES.join(';'), ...lignes].join('\r\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="membres-rec242.csv"' },
    })
  },
}

/** Lecture d'un CSV (séparateur « ; » ou « , », guillemets). */
export const lireCsv = (texte: string): string[][] => {
  const t = texte.replace(/^﻿/, '')
  const sep = (t.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) >= (t.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const lignes: string[][] = []
  let champ = ''
  let ligne: string[] = []
  let guillemets = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') {
        champ += '"'
        i++
      } else if (c === '"') guillemets = false
      else champ += c
    } else if (c === '"') guillemets = true
    else if (c === sep) {
      ligne.push(champ)
      champ = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      ligne.push(champ)
      if (ligne.some((x) => x.trim())) lignes.push(ligne)
      ligne = []
      champ = ''
    } else champ += c
  }
  ligne.push(champ)
  if (ligne.some((x) => x.trim())) lignes.push(ligne)
  return lignes
}

/**
 * Écran 05 : import initial des membres existants (CSV du modèle). `apercu: true` contrôle sans rien écrire :
 * colonnes, catégorie, doublons (e-mail ou téléphone déjà connus, ou répétés dans le fichier). Les comptes importés
 * sont « en attente d'activation » ; le lien d'activation part quand l'équipe le renvoie depuis la fiche.
 */
const importer: Endpoint = {
  path: '/import',
  method: 'post',
  handler: async (req) => {
    exiger(req, 'full')
    const b = await corps(req)
    const lignes = lireCsv(String(b.csv ?? ''))
    if (lignes.length < 2) throw new APIError('Fichier vide ou sans ligne de données.', 400, null, true)
    const entete = lignes[0].map((h) => h.trim().toLowerCase())
    const manquantes = ['prenom', 'nom', 'email', 'telephone', 'categorie', 'entreprise'].filter((c) => !entete.includes(c))
    if (manquantes.length) throw new APIError(`Colonnes manquantes : ${manquantes.join(', ')}.`, 400, null, true)
    const col = (l: string[], c: string) => (entete.includes(c) ? (l[entete.indexOf(c)] ?? '').trim() : '')
    const [secteurs, localites] = await Promise.all([
      req.payload.find({ collection: 'sectors', limit: 200, depth: 0, overrideAccess: true, req }),
      req.payload.find({ collection: 'localities', limit: 200, depth: 0, overrideAccess: true, req }),
    ])
    const vus = new Set<string>()
    const rapport: { ligne: number; nom: string; erreurs: string[] }[] = []
    const valides: { ligne: number; data: Record<string, string> }[] = []
    for (let i = 1; i < lignes.length; i++) {
      const l = lignes[i]
      const email = emailNormalise(col(l, 'email'))
      const tel = telephoneInternational(col(l, 'telephone'))
      const erreurs: string[] = []
      if (!col(l, 'prenom') || !col(l, 'nom')) erreurs.push('prénom ou nom manquant')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.push('e-mail invalide')
      if (!categorie(col(l, 'categorie'))) erreurs.push('catégorie inconnue (A, B, C, expert, partenaire, honneur)')
      if (!col(l, 'entreprise')) erreurs.push('entreprise manquante')
      for (const s of col(l, 'secteurs').split(',').map((x) => x.trim()).filter(Boolean))
        if (!secteurs.docs.some((x) => (x as unknown as { nom: string }).nom.toLowerCase() === s.toLowerCase())) erreurs.push(`secteur inconnu « ${s} »`)
      if (col(l, 'ville') && !localites.docs.some((x) => (x as unknown as { nom: string }).nom.toLowerCase() === col(l, 'ville').toLowerCase()))
        erreurs.push(`ville inconnue « ${col(l, 'ville')} »`)
      if (vus.has(email) || vus.has(tel)) erreurs.push('doublon dans le fichier')
      vus.add(email)
      if (tel) vus.add(tel)
      const deja = await req.payload.count({
        collection: 'members',
        where: { or: [{ email: { equals: email } }, ...(tel ? [{ telephone: { equals: tel } }] : [])] },
        overrideAccess: true,
        req,
      })
      if (deja.totalDocs) erreurs.push('membre déjà enregistré (même e-mail ou même téléphone)')
      const nom = `${col(l, 'prenom')} ${col(l, 'nom')}`.trim()
      if (erreurs.length) rapport.push({ ligne: i + 1, nom, erreurs })
      else valides.push({ ligne: i + 1, data: { ...Object.fromEntries(entete.map((h, k) => [h, (l[k] ?? '').trim()])), email, telephone: tel } })
    }
    if (b.apercu) return Response.json({ valides: valides.length, erreurs: rapport })
    const { randomBytes } = await import('crypto')
    let crees = 0
    for (const v of valides) {
      const d = v.data
      const ids = (d.secteurs ?? '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .map((n) => secteurs.docs.find((x) => (x as unknown as { nom: string }).nom.toLowerCase() === n)?.id)
      const loc = localites.docs.find((x) => (x as unknown as { nom: string }).nom.toLowerCase() === (d.ville ?? '').toLowerCase())
      const e = await req.payload.create({
        collection: 'companies',
        overrideAccess: true,
        req,
        // Pas de consentement connu : la fiche reste hors de l'annuaire jusqu'au choix du membre à l'activation.
        data: { nom: d.entreprise, secteurs: ids, localite: loc?.id, quartier: d.quartier, visibilite: { annuaire: false } } as never,
      })
      const m = await req.payload.create({
        collection: 'members',
        overrideAccess: true,
        req,
        data: {
          email: d.email,
          password: randomBytes(24).toString('base64url'),
          prenom: d.prenom,
          nom: d.nom,
          telephone: d.telephone,
          whatsapp: d.telephone,
          categorie: categorie(d.categorie)?.valeur,
          numeroAdherent: d.numero_adherent || undefined,
          statut: 'attente',
          dateAdhesion: d.date_adhesion ? new Date(d.date_adhesion).toISOString() : undefined,
          entreprise: e.id,
        } as never,
      })
      await req.payload.update({ collection: 'companies', id: e.id, data: { titulaire: m.id } as never, overrideAccess: true, req })
      crees++
    }
    await logAction(req.payload, { req, categorie: 'validation', action: `Import CSV : ${crees} membre(s) créé(s), ${rapport.length} ligne(s) rejetée(s)` })
    return Response.json({ crees, erreurs: rapport })
  },
}

/** Écran 05 : export pour l'imprimeur de l'annuaire (CSV des fiches éligibles et logos, en ZIP), inscrit au journal. */
const imprimeur: Endpoint = {
  path: '/export-imprimeur',
  method: 'get',
  handler: async (req) => {
    exiger(req, 'read')
    if (!atLeast(req.user, 'exports', 'full')) throw new APIError('Export non autorisé pour votre rôle.', 403)
    const { nom, donnees } = await archiveImprimeur(req.payload)
    await logAction(req.payload, { req, categorie: 'export', action: `Export imprimeur de l’annuaire (${nom})` })
    return new Response(Buffer.from(donnees), {
      headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${nom}"` },
    })
  },
}

export const endpointsMembres: Endpoint[] = [exporter, imprimeur, importer, statut, activation, masquer, fiche, relations, fin]
