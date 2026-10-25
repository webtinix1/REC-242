import { logAction } from '@/lib/audit'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

/** « Télécharger mes données » (écran 03) : fiche, entreprise, demandes et paiements du membre connecté, en JSON lisible. */
export async function GET() {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return new Response('Accès réservé aux membres actifs.', { status: 403 })
  const payload = await getPayloadClient()
  const [demandes, paiements] = await Promise.all([
    payload.find({ collection: 'modificationRequests', where: { membre: { equals: m.id } }, depth: 0, limit: 500, overrideAccess: true }),
    payload.find({ collection: 'payments', where: { membre: { equals: m.id } }, depth: 0, limit: 500, overrideAccess: true }),
  ])
  const e = m.entreprise
  const donnees = {
    exporteLe: new Date().toISOString(),
    membre: {
      numeroAdherent: m.numeroAdherent,
      prenom: m.prenom,
      nom: m.nom,
      email: m.email,
      telephone: m.telephone,
      whatsapp: m.whatsapp,
      fonction: m.fonction,
      categorie: m.categorie,
      statut: m.statut,
      dateAdhesion: m.dateAdhesion,
      validiteCarte: m.validiteCarte,
      notifications: m.notifications,
      derniereConnexion: m.derniereConnexion,
    },
    entreprise: e
      ? {
          nom: e.nom,
          secteurs: (e.secteurs ?? []).map((s) => s.nom),
          ville: e.localite?.nom,
          quartier: e.quartier,
          presentation: e.presentation,
          presentationProposee: e.presentationProposee,
          services: e.services,
          siteWeb: e.siteWeb,
          linkedin: e.linkedin,
          facebook: e.facebook,
          visibilite: e.visibilite,
        }
      : null,
    demandesDeModification: demandes.docs.map((d) => {
      const r = d as unknown as Record<string, unknown>
      return { champ: r.champ, valeurActuelle: r.valeurActuelle, nouvelleValeur: r.nouvelleValeur, statut: r.statut, date: r.createdAt }
    }),
    paiements: paiements.docs.map((d) => {
      const p = d as unknown as Record<string, unknown>
      return { numero: p.numero, objet: p.objet, montant: p.montant, mode: p.mode, statut: p.statut, date: p.datePaiement }
    }),
  }
  await logAction(payload, { categorie: 'export', action: 'Export de ses données personnelles', cible: m.numeroAdherent, author: { type: 'membre', nom: `${m.prenom} ${m.nom}` } })
  return new Response(JSON.stringify(donnees, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mes-donnees-rec242.json"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
