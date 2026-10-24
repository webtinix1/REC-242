import type { Payload } from 'payload'

import { TEMPLATES, type TemplateKey } from './defaults'
import { renderEmail, type FooterInfo, type Vars } from './render'

type Attachment = { filename: string; content: Buffer | string; contentType?: string }

type StoredTemplate = { cle?: string; objet?: string; corps?: string }

const hasGlobal = (payload: Payload, slug: string) =>
  payload.config.globals.some((g) => g.slug === slug)

/** Modèle personnalisé dans le back-office, sinon texte par défaut. */
export const getTemplate = async (payload: Payload, key: TemplateKey) => {
  const def = TEMPLATES[key]
  if (!hasGlobal(payload, 'emailTemplates')) return def
  const g = (await payload.findGlobal({
    slug: 'emailTemplates' as never,
    depth: 0,
    overrideAccess: true,
  })) as {
    modeles?: StoredTemplate[]
  }
  const custom = g?.modeles?.find((m) => m.cle === key)
  return custom?.objet && custom?.corps ? { ...def, objet: custom.objet, corps: custom.corps } : def
}

const getFooter = async (payload: Payload): Promise<FooterInfo> => {
  if (!hasGlobal(payload, 'settings')) return {}
  const s = (await payload.findGlobal({
    slug: 'settings' as never,
    depth: 0,
    overrideAccess: true,
  })) as {
    adresse?: string
    whatsapp?: { numero?: string }
  }
  return { adresse: s?.adresse, whatsapp: s?.whatsapp?.numero }
}

export type SendTemplateArgs = {
  to: string | string[]
  template: TemplateKey
  vars: Vars
  cc?: string | string[]
  replyTo?: string
  attachments?: Attachment[]
}

/** Envoie un e-mail à partir d'un modèle. Renvoie le sujet effectivement envoyé (utile pour l'historique). */
export const sendTemplate = async (
  payload: Payload,
  args: SendTemplateArgs,
): Promise<{ subject: string }> => {
  const tpl = await getTemplate(payload, args.template)
  const footer = await getFooter(payload)
  const { subject, html, text } = renderEmail(tpl.objet, tpl.corps, args.vars, footer)
  await payload.sendEmail({
    to: args.to,
    cc: args.cc,
    replyTo: args.replyTo,
    subject,
    html,
    text,
    attachments: args.attachments,
  })
  return { subject }
}

/**
 * Point d'entrée unique des notifications. Le canal WhatsApp sera branché quand l'API WhatsApp Business
 * sera disponible (docs/02-architecture.md) ; en attendant tout part par e-mail.
 */
export const notify = async (
  payload: Payload,
  args: SendTemplateArgs & { canal?: 'email' | 'whatsapp' | 'email+whatsapp' },
): Promise<void> => {
  try {
    await sendTemplate(payload, args)
  } catch (err) {
    payload.logger.error({ err, template: args.template }, 'Échec d’envoi de notification')
  }
}
