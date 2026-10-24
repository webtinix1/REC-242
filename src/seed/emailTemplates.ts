import type { Payload } from 'payload'

import { TEMPLATES, TEMPLATE_KEYS } from '@/emails/defaults'

/** Remplit le global des e-mails avec les textes par défaut, sans écraser un modèle déjà personnalisé. */
export async function seedEmailTemplates(payload: Payload): Promise<void> {
  const g = (await payload.findGlobal({ slug: 'emailTemplates', overrideAccess: true })) as {
    modeles?: { cle: string; objet: string; corps: string }[]
  }
  const current = g.modeles ?? []
  const have = new Set(current.map((m) => m.cle))
  const missing = TEMPLATE_KEYS.filter((k) => !have.has(k)).map((k) => ({
    cle: k,
    objet: TEMPLATES[k].objet,
    corps: TEMPLATES[k].corps,
  }))
  if (!missing.length) return
  await payload.updateGlobal({
    slug: 'emailTemplates',
    overrideAccess: true,
    data: { modeles: [...current, ...missing] as never },
  })
  payload.logger.info(`Modèles d’e-mails : ${missing.length} ajoutés.`)
}
