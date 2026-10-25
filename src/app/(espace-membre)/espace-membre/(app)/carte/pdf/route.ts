import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import { genererCartePdf } from '@/lib/membres/cartePdf'
import { dateLongue, lettreCategorie, membreConnecte, nomCategorie } from '@/lib/membres/espace'
import { statutMembreLabel } from '@/lib/membres/options'

/** « Télécharger en PDF » (écran 13) : réservé au membre actif connecté. */
export async function GET() {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif' || !m.numeroAdherent) return new Response('Accès réservé aux membres actifs.', { status: 403 })
  let photo: { data: Uint8Array; type: 'png' } | undefined
  const p = m.photo && typeof m.photo === 'object' ? (m.photo as { filename?: string | null }) : null
  if (p?.filename) {
    try {
      const fichier = await fs.readFile(path.resolve(process.cwd(), 'media', p.filename))
      photo = { data: await sharp(fichier).resize(240, 240, { fit: 'cover' }).png().toBuffer(), type: 'png' }
    } catch {
      photo = undefined
    }
  }
  const pdf = await genererCartePdf({
    nom: `${m.prenom} ${m.nom}`,
    entreprise: m.entreprise?.nom,
    categorie: `${lettreCategorie(m.categorie)} · ${nomCategorie(m.categorie)}`,
    numero: m.numeroAdherent,
    statut: statutMembreLabel(m.statut),
    validite: dateLongue(m.validiteCarte),
    photo,
  })
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="carte-${m.numeroAdherent}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
