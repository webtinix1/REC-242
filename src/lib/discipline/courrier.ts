import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const VERT = rgb(11 / 255, 94 / 255, 50 / 255)
const NOIR = rgb(0.09, 0.1, 0.09)
const GRIS = rgb(0.38, 0.4, 0.37)
const net = (s: string) => s.replace(/[  ]/g, ' ').replace(/[’]/g, "'").replace(/[«»]/g, '"')

/** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
const couper = (texte: string, largeur: number, mesure: (s: string) => number) => {
  const lignes: string[] = []
  for (const para of texte.split('\n')) {
    let ligne = ''
    for (const mot of para.split(' ')) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (mesure(essai) > largeur && ligne) {
        lignes.push(ligne)
        ligne = mot
      } else ligne = essai
    }
    lignes.push(ligne)
  }
  return lignes
}

/** Courrier disciplinaire (A4) joint à l'e-mail : notification des griefs ou décision du comité. */
export async function courrierDiscipline(
  type: 'griefs' | 'decision',
  d: { numero: string; membre: string; date: string; lignes: string[] },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${type === 'griefs' ? 'Notification de griefs' : 'Décision du comité de direction'} ${d.numero}`)
  pdf.setAuthor('REC 242')
  const page = pdf.addPage([595, 842])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const marge = 56
  let y = 842 - marge
  try {
    const logo = await pdf.embedJpg(await fs.readFile(path.resolve(process.cwd(), 'public/images/logo-rec242.jpg')))
    const w = 130
    const h = (w * logo.height) / logo.width
    page.drawImage(logo, { x: marge, y: y - h, width: w, height: h })
    y -= h + 24
  } catch {
    page.drawText('REC 242', { x: marge, y: y - 20, size: 20, font: bold, color: VERT })
    y -= 44
  }
  page.drawText(net(`Brazzaville, le ${d.date}`), { x: 595 - marge - regular.widthOfTextAtSize(net(`Brazzaville, le ${d.date}`), 10), y, size: 10, font: regular, color: GRIS })
  y -= 30
  page.drawText(net(d.membre), { x: marge, y, size: 11, font: bold, color: NOIR })
  y -= 34
  const titre = type === 'griefs' ? 'Notification de griefs' : 'Décision du comité de direction'
  page.drawText(net(`${titre} (dossier ${d.numero})`), { x: marge, y, size: 15, font: bold, color: NOIR })
  y -= 10
  page.drawRectangle({ x: marge, y, width: 595 - 2 * marge, height: 2, color: VERT })
  y -= 26
  for (const bloc of d.lignes) {
    for (const l of couper(net(bloc), 595 - 2 * marge, (s) => regular.widthOfTextAtSize(s, 11))) {
      page.drawText(l, { x: marge, y, size: 11, font: regular, color: NOIR })
      y -= 16
    }
    y -= 8
  }
  y -= 20
  page.drawText(net('Pour le comité de direction de REC 242'), { x: marge, y, size: 11, font: regular, color: NOIR })
  page.drawText(net('Article 15 des statuts : procédure contradictoire, recours devant l’assemblée générale sous 30 jours.'), {
    x: marge,
    y: 40,
    size: 8,
    font: regular,
    color: GRIS,
  })
  return pdf.save()
}
