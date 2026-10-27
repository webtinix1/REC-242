'use client'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useEffect } from 'react'

declare global {
  interface Window {
    RECMotion?: { scan: () => void }
  }
}

/** Charge le moteur d'animation de la maquette (design/rec-motion.js) et relance son analyse à chaque changement de page. */
export const Motion = () => {
  const pathname = usePathname()
  useEffect(() => {
    window.RECMotion?.scan()
  }, [pathname])

  return <Script src="/js/rec-motion.min.js" strategy="afterInteractive" />
}
