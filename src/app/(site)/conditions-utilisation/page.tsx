import type { Metadata } from 'next'

import { LegalPage } from '@/components/site/LegalPage'
import { pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/conditions-utilisation', { fallbackTitle: 'Conditions d’utilisation' })
}

export default function Conditions() {
  return <LegalPage chemin="/conditions-utilisation" head="bg-tint trame" foot="bg-warm" />
}
