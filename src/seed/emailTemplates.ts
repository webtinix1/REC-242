import type { Payload } from 'payload'

import { TEMPLATES, TEMPLATE_KEYS, type TemplateKey } from '@/emails/defaults'

/**
 * Anciens textes par défaut remplacés depuis : un modèle resté identique à l'ancien texte (jamais personnalisé)
 * reçoit le nouveau. 28/10/2026 : les mises en relation passent par la messagerie, sans partage de coordonnées.
 */
const ANCIENS: Partial<Record<TemplateKey, string[]>> = {
  miseEnRelationRecue: [
    `{{demandeur}}, {{entreprise_demandeur}} : « {{message}} ».

Vos coordonnées ne sont transmises que si vous acceptez.

[bouton] Accepter ou refuser | {{lien}}`,
  ],
}

/** Remplit le global des e-mails avec les textes par défaut, sans écraser un modèle déjà personnalisé. */
export async function seedEmailTemplates(payload: Payload): Promise<void> {
  const g = (await payload.findGlobal({ slug: 'emailTemplates', overrideAccess: true })) as {
    modeles?: { cle: string; objet: string; corps: string }[]
  }
  let modifies = 0
  const current = (g.modeles ?? []).map((m) => {
    const anciens = ANCIENS[m.cle as TemplateKey]
    if (anciens?.includes(m.corps)) {
      modifies++
      return { ...m, corps: TEMPLATES[m.cle as TemplateKey].corps }
    }
    return m
  })
  const have = new Set(current.map((m) => m.cle))
  const missing = TEMPLATE_KEYS.filter((k) => !have.has(k)).map((k) => ({
    cle: k,
    objet: TEMPLATES[k].objet,
    corps: TEMPLATES[k].corps,
  }))
  if (!missing.length && !modifies) return
  await payload.updateGlobal({
    slug: 'emailTemplates',
    overrideAccess: true,
    data: { modeles: [...current, ...missing] as never },
  })
  payload.logger.info(`Modèles d’e-mails : ${missing.length} ajoutés, ${modifies} mis à jour.`)
}
