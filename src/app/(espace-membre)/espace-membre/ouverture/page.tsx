import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ouverture de votre espace', robots: { index: false } }

type SP = Promise<{ vers?: string }>

/**
 * Relais d'un lien d'e-mail ou d'un favori vers l'espace membre (voir `exigerMembre`) : la page recharge l'adresse demandée
 * depuis le site, pour que le cookie de session soit accepté. Seules les adresses de l'espace membre sont suivies.
 */
export default async function Ouverture({ searchParams }: { searchParams: SP }) {
  const { vers } = await searchParams
  const cible = vers && /^\/espace-membre(\/|\?|$)/.test(vers) && !vers.startsWith('/espace-membre/ouverture') ? vers : '/espace-membre'
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${cible}`} />
      <main className="mb" style={{ padding: 24 }}>
        <h1 className="h-m">Ouverture de votre espace</h1>
        <p>
          <a href={cible}>Continuer vers votre espace membre</a>
        </p>
      </main>
    </>
  )
}
