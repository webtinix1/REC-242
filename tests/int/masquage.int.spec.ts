import { describe, expect, it } from 'vitest'

import { COORDONNEE_MASQUEE as X, masquerCoordonnees } from '@/lib/echanges/masquage'

/**
 * Masquage des coordonnées dans les échanges entre membres (décision de Webtinix du 28/10/2026) : contournements
 * relevés par l'audit de sécurité et textes ordinaires qui doivent rester intacts. Aucune base nécessaire.
 */
const masques: [string, string][] = [
  // Numéros, séparateurs variés
  ['Appelez-moi au 06 612 34 56', `Appelez-moi au ${X}`],
  ['06/612/34/56', X],
  ['06_612_34_56', X],
  ['06,612,34,56', X],
  ['06    612    34    56', X],
  ['06-612-34-56', X],
  ['Tél 06-903-47-25 svp', `Tél ${X} svp`],
  ['Appelez le 065123418', `Appelez le ${X}`],
  ['WhatsApp : +242 06 903 47 25.', `WhatsApp : ${X}.`],
  // Chiffres pleine largeur ou arabes, caractères invisibles, lettres à la place des chiffres
  ['０６６１２３４５６', X],
  ['٠٦٦١٢٣٤٥٦', X],
  ['0​6​6​1​2​3​4​5​6', X],
  ['06 612 34 5​6', X],
  ['O6 6l2 34 56', X],
  // Ni une devise ni une forme de date n'exemptent un numéro, et rien ne fuit à côté du masque
  ['06612345 F', `${X} F`],
  ['06 612 34 56 FCFA', `${X} FCFA`],
  ['+242 06 612 34 56 FCFA', `${X} FCFA`],
  ['06 612 34 56 XAF', `${X} XAF`],
  ['06.61.2345', X],
  ['12 345 678 FCFA', `${X} FCFA`],
  // En toutes lettres
  ['zéro six soixante-six douze trente-quatre cinquante-six', X],
  ['whatsapp: zero six 612 34 56', `whatsapp: ${X}`],
  // E-mails
  ['écrivez à herve.ondongo@fakodrop.cg', `écrivez à ${X}`],
  ['christelle@kimia.cg', X],
  ['christelle[@]kimia.cg', X],
  ['christelle(@)kimia.cg', X],
  ['christelle(a)kimia.cg', X],
  ['christelle [at] kimia.cg', X],
  ['christelle (at) kimia (dot) cg', X],
  ['herve (at) fakodrop (dot) cg', X],
  ['christelle arobase kimia point cg', X],
  ['christelle chez kimiacreations point cg', X],
  ['christelle @ gmail', X],
  ['christelle＠kimia．cg', X],
  // Messageries
  ['lien wa.me/242069034725', `lien ${X}`],
  ['https://chat.whatsapp.com/AbCdEf', X],
  ['insta : instagram.com/kimia_creations', `insta : ${X}`],
  ['facebook.com/messages/t/kimia', X],
  ['https://m.me/kimia', X],
  ['t.me/kimia242', X],
  ['linkedin.com/in/christelle-k', X],
  ['tiktok.com/@kimia', X],
  ['telegram @kimia242', X],
  ['mon Telegram : @kimia242', `mon Telegram : ${X}`],
  ['Snapchat : @kimia.cg', `Snapchat : ${X}`],
]

const intacts = [
  'Budget de 10 000 000 FCFA, livraison le 12/11/2026 ou le 12.11.2026, salle 12.',
  '50 000 FCFA',
  '1 250 000 F CFA',
  'Le 12 500 000 FCFA… prévu',
  'Entre 500 000 - 1 000 000 FCFA',
  'En 2026, 50 000 FCFA',
  'Saison 2025-2026 : 1 250 000 FCFA',
  'Le 12-11-2026 à 14:30',
  '12/11/2026 14:30',
  'du 2026-11-12 au 2026-11-15',
  'salle 12, 12/11/2026',
  'Commande de 2 500 sacs le 12/11/2026',
  'Je suis chez moi',
  'Rendez-vous au point de vente',
  'Je travaille chez Total point de vente de Mpila',
  'Il est parfait. Merci M. Mendes',
  'Il a un, deux ou trois ans',
  'deux mille vingt-six',
  'trois cent cinquante mille francs',
  'Rendez-vous à 14h30 au siège',
  'Article 12, alinéa 3',
  'Contactez-moi sur WhatsApp ou par e-mail depuis la plateforme, merci.',
  'Notre page Facebook et notre compte Instagram présentent nos produits.',
]

describe('Masquage des coordonnées', () => {
  it.each(masques)('masque « %s »', (texte, attendu) => {
    expect(masquerCoordonnees(texte)).toBe(attendu)
  })

  it.each(intacts)('laisse intact « %s »', (texte) => {
    expect(masquerCoordonnees(texte)).toBe(texte)
  })

  it('ne modifie que la coordonnée et reste stable si on l’applique deux fois', () => {
    const texte = 'Bonjour… voici le devis de 50 000 FCFA. Mon numéro : 06 612 34 56.'
    const une = masquerCoordonnees(texte)
    expect(une).toBe(`Bonjour… voici le devis de 50 000 FCFA. Mon numéro : ${X}.`)
    expect(masquerCoordonnees(une)).toBe(une)
  })
})
