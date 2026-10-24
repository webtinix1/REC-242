/**
 * Rendu des e-mails : gabarit HTML unique aux couleurs de REC 242 et version texte brut.
 */
export type Vars = Record<string, string | number | null | undefined>

const COLORS = {
  green: '#0b5e32',
  ink: '#171a17',
  muted: '#62675f',
  sand: '#faf8f3',
  border: '#e7e4da',
  gold: '#fbb517',
  red: '#df1521',
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const fill = (text: string, vars: Vars): string =>
  text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, k: string) => {
    const v = vars[k]
    return v === null || v === undefined ? '' : String(v)
  })

/** Garde ou retire les passages [si variable] … [fin]. */
const conditionals = (text: string, vars: Vars): string =>
  text.replace(/\[si ([a-z0-9_]+)\]([\s\S]*?)\[fin\]/gi, (_m, k: string, inner: string) =>
    vars[k] !== undefined && vars[k] !== null && vars[k] !== '' ? inner.trim() : '',
  )

type Block = { kind: 'p'; text: string } | { kind: 'button'; label: string; href: string }

const parse = (corps: string, vars: Vars): Block[] =>
  conditionals(corps, vars)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const m = b.match(/^\[bouton\]\s*(.+?)\s*\|\s*(.+)$/)
      if (m) return { kind: 'button' as const, label: fill(m[1], vars), href: fill(m[2], vars).trim() }
      return { kind: 'p' as const, text: fill(b, vars) }
    })
    .filter((b) => (b.kind === 'button' ? Boolean(b.href) : b.text.trim() !== ''))

export type FooterInfo = { adresse?: string; whatsapp?: string; siteUrl?: string }

export const renderEmail = (
  objet: string,
  corps: string,
  vars: Vars,
  footer: FooterInfo = {},
): { subject: string; html: string; text: string } => {
  const subject = fill(objet, vars).replace(/\s+/g, ' ').trim()
  const blocks = parse(corps, vars)
  const site = footer.siteUrl || process.env.NEXT_PUBLIC_SERVER_URL || ''

  const htmlBlocks = blocks
    .map((b) =>
      b.kind === 'button'
        ? `<p style="margin:28px 0"><a href="${escapeHtml(b.href)}" style="display:inline-block;background:${COLORS.green};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:8px">${escapeHtml(b.label)}</a></p>`
        : `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${COLORS.ink}">${escapeHtml(b.text).replace(/\n/g, '<br>')}</p>`,
    )
    .join('\n')

  const footerLines = [
    'REC 242 · Réseau des Entrepreneurs Congolais',
    footer.adresse,
    footer.whatsapp ? `WhatsApp ${footer.whatsapp}` : '',
  ].filter(Boolean) as string[]

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.sand};font-family:Inter,'Segoe UI',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.sand}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${COLORS.border};border-radius:12px">
<tr><td style="padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="height:4px;background:${COLORS.green}"></td><td style="height:4px;background:${COLORS.gold}"></td><td style="height:4px;background:${COLORS.red}"></td></tr></table></td></tr>
<tr><td style="padding:28px 32px 8px"><img src="${escapeHtml(site)}/images/logo-rec242.jpg" alt="REC 242" height="40" style="height:40px;width:auto;display:block"></td></tr>
<tr><td style="padding:16px 32px 16px">
${htmlBlocks}
<p style="margin:24px 0 0;font-size:16px;line-height:1.6;color:${COLORS.ink}">L'équipe de REC 242</p>
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${COLORS.border};font-size:13px;line-height:1.5;color:${COLORS.muted}">
${footerLines.map(escapeHtml).join('<br>')}<br>
<a href="${escapeHtml(site)}/confidentialite" style="color:${COLORS.muted}">Politique de confidentialité</a>
</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    ...blocks.map((b) => (b.kind === 'button' ? `${b.label} : ${b.href}` : b.text)),
    "L'équipe de REC 242",
    '',
    '--',
    ...footerLines,
    `${site}/confidentialite`,
  ].join('\n\n')

  return { subject, html, text }
}
