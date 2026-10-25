import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import { jetonCarte, qrPng } from './carte'

export type DonneesCarte = {
  nom: string
  entreprise?: string
  categorie: string
  numero: string
  statut: string
  validite?: string
  photo?: { data: Uint8Array; type: 'png' | 'jpg' }
}

const VERT = rgb(11 / 255, 94 / 255, 50 / 255)
const OR = rgb(245 / 255, 176 / 255, 33 / 255)
const ROUGE = rgb(200 / 255, 38 / 255, 38 / 255)
const GRIS = rgb(0.38, 0.4, 0.37)
const NOIR = rgb(0.09, 0.1, 0.09)
const net = (s?: string) => (s ?? '').replace(/[  ]/g, ' ').replace(/[’]/g, "'")

/** Carte de membre au format carte de crédit (85,6 × 54 mm), prête à imprimer. */
export async function genererCartePdf(d: DonneesCarte): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Carte de membre ${d.numero}`)
  pdf.setAuthor('REC 242')
  const mm = 72 / 25.4
  const W = 85.6 * mm
  const H = 54 * mm
  const page = pdf.addPage([W, H])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const courier = await pdf.embedFont(StandardFonts.CourierBold)

  // Bandeau vert et filet tricolore.
  const bandeau = 13 * mm
  page.drawRectangle({ x: 0, y: H - bandeau, width: W, height: bandeau, color: VERT })
  const tiers = W / 3
  page.drawRectangle({ x: 0, y: H - bandeau - 3, width: tiers, height: 3, color: VERT })
  page.drawRectangle({ x: tiers, y: H - bandeau - 3, width: tiers, height: 3, color: OR })
  page.drawRectangle({ x: 2 * tiers, y: H - bandeau - 3, width: tiers, height: 3, color: ROUGE })
  try {
    const logo = await pdf.embedJpg(await fs.readFile(path.resolve(process.cwd(), 'public/images/logo-rec242.jpg')))
    const h = bandeau - 4 * mm
    const w = (h * logo.width) / logo.height
    page.drawRectangle({ x: 3 * mm, y: H - bandeau + 1.5 * mm, width: w + 2 * mm, height: h + 1 * mm, color: rgb(1, 1, 1) })
    page.drawImage(logo, { x: 4 * mm, y: H - bandeau + 2 * mm, width: w, height: h })
  } catch {
    page.drawText('REC 242', { x: 4 * mm, y: H - bandeau + 4 * mm, size: 12, font: bold, color: rgb(1, 1, 1) })
  }
  const st = net(d.statut)
  page.drawText(st, { x: W - 4 * mm - bold.widthOfTextAtSize(st, 7), y: H - bandeau + 5 * mm, size: 7, font: bold, color: rgb(1, 1, 1) })

  // QR code signé à droite.
  const qrTaille = 26 * mm
  const qr = await pdf.embedPng(await qrPng(jetonCarte(d.numero), 400))
  page.drawImage(qr, { x: W - qrTaille - 3 * mm, y: 3.5 * mm, width: qrTaille, height: qrTaille })

  // Identité à gauche.
  let x = 4 * mm
  if (d.photo) {
    const img = d.photo.type === 'png' ? await pdf.embedPng(d.photo.data) : await pdf.embedJpg(d.photo.data)
    const t = 13 * mm
    page.drawImage(img, { x, y: H - bandeau - 4 * mm - t, width: t, height: t })
    x += t + 3 * mm
  }
  const largeur = W - qrTaille - 6 * mm - x
  let y = H - bandeau - 8 * mm
  page.drawText(net(d.nom), { x, y, size: 9.5, font: bold, color: NOIR, maxWidth: largeur })
  y -= 4.2 * mm
  if (d.entreprise) {
    page.drawText(net(d.entreprise), { x, y, size: 7, font: regular, color: GRIS, maxWidth: largeur })
    y -= 3.6 * mm
  }
  page.drawText(net(`Catégorie ${d.categorie}`), { x, y, size: 7, font: regular, color: NOIR, maxWidth: largeur })
  y = 9 * mm
  page.drawText(d.numero, { x: 4 * mm, y, size: 10, font: courier, color: VERT })
  if (d.validite) page.drawText(net(`Valable jusqu'au ${d.validite}`), { x: 4 * mm, y: 4.5 * mm, size: 6.5, font: regular, color: GRIS })
  return pdf.save()
}
