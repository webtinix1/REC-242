import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import { fcfa } from '@/lib/adhesion/categories'

export type DonneesRecu = {
  numero: string
  date: string
  payeur: string
  entreprise?: string
  reference?: string
  objet: string
  montant: number
  mode: string
  referenceOperateur?: string
  adresse?: string
  email?: string
  whatsapp?: string
}

const VERT = rgb(11 / 255, 94 / 255, 50 / 255)
const GRIS = rgb(0.38, 0.4, 0.37)
const NOIR = rgb(0.09, 0.1, 0.09)

/** Polices standard PDF (WinAnsi) : on remplace les espaces fines et insécables par des espaces simples. */
const net = (s?: string) => (s ?? '').replace(/[  ]/g, ' ')

/** Reçu officiel numéroté (PDF A5), généré à la demande à partir du paiement enregistré. */
export async function genererRecu(d: DonneesRecu): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Reçu ${d.numero}`)
  pdf.setAuthor('REC 242')
  const page = pdf.addPage([420, 595])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const marge = 36

  try {
    const logo = await pdf.embedJpg(await fs.readFile(path.resolve(process.cwd(), 'public/images/logo-rec242.jpg')))
    const w = 120
    page.drawImage(logo, { x: marge, y: height - marge - (w * logo.height) / logo.width, width: w, height: (w * logo.height) / logo.width })
  } catch {
    page.drawText('REC 242', { x: marge, y: height - marge - 20, size: 20, font: bold, color: VERT })
  }

  let y = height - 120
  page.drawText('Reçu de paiement', { x: marge, y, size: 20, font: bold, color: NOIR })
  y -= 22
  page.drawText(net(`N° ${d.numero} · ${d.date}`), { x: marge, y, size: 11, font: regular, color: GRIS })
  y -= 18
  page.drawRectangle({ x: marge, y, width: width - 2 * marge, height: 2, color: VERT })

  const ligne = (libelle: string, valeur?: string) => {
    if (!valeur) return
    y -= 28
    page.drawText(libelle, { x: marge, y, size: 9, font: regular, color: GRIS })
    page.drawText(net(valeur), { x: marge, y: y - 13, size: 11, font: bold, color: NOIR, maxWidth: width - 2 * marge })
    y -= 10
  }
  ligne('Reçu de', d.payeur)
  ligne('Entreprise', d.entreprise)
  ligne('Dossier ou adhérent', d.reference)
  ligne('Objet', d.objet)
  ligne('Mode de paiement', d.mode)
  ligne('Référence de l’opération', d.referenceOperateur)

  y -= 34
  page.drawRectangle({ x: marge, y: y - 12, width: width - 2 * marge, height: 44, color: rgb(0.93, 0.96, 0.93) })
  page.drawText('Montant reçu', { x: marge + 12, y: y + 12, size: 9, font: regular, color: GRIS })
  page.drawText(net(fcfa(d.montant)), { x: marge + 12, y: y - 4, size: 16, font: bold, color: VERT })

  const pied = [
    'REC 242 · Réseau des Entrepreneurs Congolais',
    d.adresse,
    [d.email, d.whatsapp ? `WhatsApp ${d.whatsapp}` : ''].filter(Boolean).join(' · '),
    'Reçu officiel émis par REC 242.',
  ].filter(Boolean) as string[]
  pied.forEach((t, i) => page.drawText(net(t), { x: marge, y: marge + (pied.length - 1 - i) * 12, size: 8, font: regular, color: GRIS }))

  return pdf.save()
}
