/** Fichier calendrier (.ics, RFC 5545) d'un événement. */
const date = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const texte = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
// Lignes de 75 octets au plus, continuées par une espace.
const plier = (l: string) => l.match(/.{1,70}/g)?.join('\r\n ') ?? l

export function fichierIcs(e: { id: number | string; titre: string; debut: string; fin?: string | null; lieu?: string; description?: string; url?: string }) {
  const debut = new Date(e.debut)
  const fin = e.fin ? new Date(e.fin) : new Date(debut.getTime() + 2 * 3600 * 1000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//REC 242//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:evenement-${e.id}@rec242.cg`,
    `DTSTAMP:${date(new Date())}`,
    `DTSTART:${date(debut)}`,
    `DTEND:${date(fin)}`,
    `SUMMARY:${texte(e.titre)}`,
    e.lieu ? `LOCATION:${texte(e.lieu)}` : '',
    e.description ? `DESCRIPTION:${texte(e.description)}` : '',
    e.url ? `URL:${e.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .map(plier)
    .join('\r\n')
}
