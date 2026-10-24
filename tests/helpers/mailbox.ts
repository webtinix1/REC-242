/**
 * Lecture des e-mails capturés en développement.
 * Mailpit (docker compose) : http://localhost:8025 · MailDev : http://localhost:1080.
 * Variable MAILBOX_URL pour forcer l'adresse.
 */
export type Mail = { to: string[]; subject: string; html: string; text: string; time: string }

const candidates = process.env.MAILBOX_URL ? [process.env.MAILBOX_URL] : ['http://localhost:8025', 'http://localhost:1080']

export async function listMails(): Promise<Mail[]> {
  for (const base of candidates) {
    try {
      const md = await fetch(`${base}/api/email`)
      if (md.ok) {
        const list = (await md.json()) as { to: { address: string }[]; subject: string; html?: string; text?: string; time: string }[]
        return list.map((m) => ({ to: m.to.map((t) => t.address), subject: m.subject, html: m.html || '', text: m.text || '', time: m.time }))
      }
      const mp = await fetch(`${base}/api/v1/messages`)
      if (mp.ok) {
        const { messages } = (await mp.json()) as { messages: { ID: string; To: { Address: string }[]; Subject: string; Created: string }[] }
        return Promise.all(
          messages.map(async (m) => {
            const full = (await (await fetch(`${base}/api/v1/message/${m.ID}`)).json()) as { HTML: string; Text: string }
            return { to: m.To.map((t) => t.Address), subject: m.Subject, html: full.HTML, text: full.Text, time: m.Created }
          }),
        )
      }
    } catch {
      // essai suivant
    }
  }
  throw new Error('Aucune boîte de capture d’e-mails disponible (Mailpit ou MailDev).')
}

/** Attend un e-mail pour ce destinataire, plus récent que `since`. */
export async function waitForMail(to: string, since: Date, match?: RegExp, timeoutMs = 15000): Promise<Mail> {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const mails = await listMails()
    const m = mails
      .filter((x) => x.to.includes(to) && new Date(x.time).getTime() >= since.getTime() - 1000 && (!match || match.test(x.subject)))
      .sort((a, b) => b.time.localeCompare(a.time))[0]
    if (m) return m
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Aucun e-mail reçu pour ${to}`)
}
