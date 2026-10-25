import type { Metadata } from 'next'

import { LegalPage } from '@/components/site/LegalPage'
import { pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/confidentialite', { fallbackTitle: 'Confidentialité' })
}

export default function Confidentialite() {
  return <LegalPage chemin="/confidentialite" head="bg-green dark rings rings-w" foot="bg-warm" />
}
