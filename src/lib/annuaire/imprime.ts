import fs from 'fs/promises'
import path from 'path'
import type { Payload } from 'payload'

import { categorie, telephoneAffiche } from '@/lib/adhesion/categories'
import { celluleCsv } from '@/lib/csv'
import { situationCotisation, type PaiementMembre } from '@/lib/membres/cotisation'

export type FicheImprimee = {
  numero: string
  entreprise: string
  secteurs: string
  ville: string
  categorie: string
  contact: string
  logo?: string
  encart?: string
}

/**
 * Annuaire imprimé (docs/05-regles-metier.md §6) : membres actifs, ayant consenti à l'annuaire, fiche non masquée,
 * à jour de cotisation à la date de clôture (paiements enregistrés jusqu'à cette date).
 * Le contact imprimé est le premier que le membre affiche aux membres (téléphone, WhatsApp, puis e-mail).
 */
export async function fichesImprimees(payload: Payload): Promise<{ edition?: string; cloture?: string; fiches: FicheImprimee[] }> {
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as { annuaire?: { edition?: string; cloture?: string } }
  const cloture = s.annuaire?.cloture ? new Date(s.annuaire.cloture) : new Date()
  const [entreprises, encarts] = await Promise.all([
    payload.find({
      collection: 'companies',
      where: { and: [{ 'visibilite.annuaire': { equals: true } }, { masqueeParAdmin: { not_equals: true } }, { 'titulaire.statut': { equals: 'actif' } }] },
      depth: 2,
      limit: 5000,
      sort: 'nom',
      overrideAccess: true,
    }),
    payload.find({ collection: 'directoryAds', where: { and: [{ edition: { equals: s.annuaire?.edition ?? '' } }, { statut: { in: ['paye', 'inclus'] } }] }, depth: 0, limit: 1000, overrideAccess: true }),
  ])
  const ids = entreprises.docs.map((e) => (e as unknown as { titulaire?: { id: number } }).titulaire?.id).filter(Boolean) as number[]
  const paiements = ids.length
    ? ((await payload.find({ collection: 'payments', where: { membre: { in: ids } }, depth: 0, limit: 10000, overrideAccess: true })).docs as unknown as PaiementMembre[])
    : []
  const fiches: FicheImprimee[] = []
  for (const d of entreprises.docs) {
    const e = d as unknown as {
      nom: string
      secteurs?: { nom: string }[]
      localite?: { nom: string } | null
      logo?: { filename?: string } | null
      visibilite?: { telephone?: boolean; whatsapp?: boolean; email?: boolean }
      titulaire?: { id: number; numeroAdherent?: string; categorie?: string; telephone?: string; whatsapp?: string; email?: string; cotisation?: { droit?: number; montant?: number; tranches?: number } }
    }
    const t = e.titulaire
    if (!t) continue
    const siens = paiements.filter((p) => (typeof p.membre === 'object' ? p.membre?.id : p.membre) === t.id && (!p.datePaiement || new Date(p.datePaiement) <= cloture))
    if (situationCotisation(t, siens).reste > 0) continue
    const v = e.visibilite ?? {}
    const contact = v.telephone && t.telephone ? telephoneAffiche(t.telephone) : v.whatsapp && (t.whatsapp || t.telephone) ? `WhatsApp ${telephoneAffiche(t.whatsapp || t.telephone)}` : v.email && t.email ? t.email : ''
    const encart = encarts.docs.find((a) => (a as unknown as { membre: number }).membre === t.id) as unknown as { format?: string } | undefined
    fiches.push({
      numero: t.numeroAdherent ?? '',
      entreprise: e.nom,
      secteurs: (e.secteurs ?? []).map((x) => x.nom).join(', '),
      ville: e.localite?.nom ?? '',
      categorie: categorie(t.categorie ?? '')?.lettre ?? '',
      contact,
      logo: e.logo?.filename ?? undefined,
      encart: encart?.format,
    })
  }
  return { edition: s.annuaire?.edition, cloture: s.annuaire?.cloture, fiches }
}

/** Export pour l'imprimeur : CSV des fiches et dossier des logos, dans une archive ZIP. */
export async function archiveImprimeur(payload: Payload): Promise<{ nom: string; donnees: Uint8Array }> {
  const { zipSync, strToU8 } = await import('fflate')
  const { edition, fiches } = await fichesImprimees(payload)
  // Cellule neutralisée : une raison sociale saisie « =… » ne devient pas une formule dans le tableur.
  const esc = (v: string) => celluleCsv(v)
  const lignes = [
    'numero_adherent;entreprise;secteurs;ville;categorie;contact;encart;fichier_logo',
    ...fiches.map((f) => [f.numero, f.entreprise, f.secteurs, f.ville, f.categorie, f.contact, f.encart ?? 'standard', f.logo ? `logos/${f.logo}` : ''].map(esc).join(';')),
  ]
  const fichiers: Record<string, Uint8Array> = { 'fiches.csv': strToU8('﻿' + lignes.join('\r\n')) }
  for (const f of fiches) {
    if (!f.logo) continue
    try {
      fichiers[`logos/${f.logo}`] = new Uint8Array(await fs.readFile(path.resolve(process.cwd(), 'media', f.logo)))
    } catch {
      // logo absent du disque : la ligne garde son nom de fichier, l'imprimeur le signalera
    }
  }
  return { nom: `annuaire-rec242-${edition ?? 'edition'}.zip`, donnees: zipSync(fichiers, { level: 6 }) }
}
