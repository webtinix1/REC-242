import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

/**
 * Le site public est prérendu : toute modification d'un contenu qu'il affiche relance le rendu des pages.
 * Hors d'une requête Next (seed, tâches, tests), revalidatePath n'est pas disponible : on l'ignore.
 */
const revalider = async () => {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    // Contexte sans cache Next : rien à invalider.
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  await revalider()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalider()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = async ({ doc }) => {
  await revalider()
  return doc
}

/** Hooks à ajouter aux collections lues par le site. */
export const siteHooks = {
  afterChange: [revalidateAfterChange],
  afterDelete: [revalidateAfterDelete],
}

const SITE_COLLECTIONS = [
  'pages',
  'news',
  'documents',
  'media',
  'people',
  'commissions',
  'partners',
  'faq',
  'testimonials',
  'sectors',
  'localities',
  'eventTypes',
  'expertiseTags',
]
const SITE_GLOBALS = ['settings', 'navigation']

/** Ajoute la revalidation du site aux collections et globals qu'il affiche (les lots suivants complètent les listes). */
export const withSiteRevalidation = <T extends { slug: string; hooks?: Record<string, unknown> }>(
  c: T,
  kind: 'collection' | 'global',
): T => {
  if (!(kind === 'collection' ? SITE_COLLECTIONS : SITE_GLOBALS).includes(c.slug)) return c
  const h = (c.hooks ?? {}) as Record<string, unknown[]>
  return {
    ...c,
    hooks:
      kind === 'collection'
        ? {
            ...h,
            afterChange: [...(h.afterChange ?? []), revalidateAfterChange],
            afterDelete: [...(h.afterDelete ?? []), revalidateAfterDelete],
          }
        : { ...h, afterChange: [...(h.afterChange ?? []), revalidateGlobal] },
  }
}
