import type { Metadata } from 'next'

import { LegalPage } from '@/components/site/LegalPage'
import { pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/mentions-legales', { fallbackTitle: 'Mentions légales' })
}

export default function MentionsLegales() {
  return <LegalPage chemin="/mentions-legales" head="bg-night dark net" foot="bg-tint" />
}
