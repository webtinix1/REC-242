import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

/** Quitte l'aperçu des brouillons. */
export async function GET() {
  ;(await draftMode()).disable()
  redirect('/')
}
