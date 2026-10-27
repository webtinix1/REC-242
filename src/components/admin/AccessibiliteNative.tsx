'use client'
import React, { useEffect } from 'react'

/**
 * Lot 12, accessibilité : complète les attributs manquants des composants natifs de Payload 3 (boutons-icônes sans nom,
 * listes déroulantes et champ date sans étiquette reliée, onglets du document, aperçu SEO), relevés par axe-core.
 * Chaque règle n'ajoute un attribut que s'il manque : le rendu et le comportement de Payload ne changent pas.
 */
const NOMS: [string, string][] = [
  ['.doc-controls__popup .popup-button', 'Plus d’actions'],
  ['.clipboard-action__popup .popup-button', 'Copier ou coller'],
  ['.array-actions .popup-button', 'Actions sur la ligne'],
  ['.popup-button', 'Ouvrir le menu'],
  ['.clickable-arrow--left', 'Page précédente'],
  ['.clickable-arrow--right', 'Page suivante'],
  ['.collapsible__drag', 'Déplacer'],
  ['.upload-relationship-details__edit', 'Modifier le fichier'],
  ['.upload-relationship-details__remove', 'Retirer le fichier'],
  ['.date-time-picker__clear-button', 'Effacer la date'],
]

const sansNom = (el: Element) =>
  !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !(el.textContent || '').trim()

/** Étiquette visible du champ qui contient l'élément, avec un identifiant pour `aria-labelledby`. */
function etiquette(el: Element): string | null {
  const champ = el.closest('.field-type')
  const label = champ?.querySelector(':scope > label, :scope > .field-label, label.field-label')
  if (!label) return null
  if (!label.id) label.id = `etq-${champ?.id || Math.random().toString(36).slice(2, 9)}`
  return label.id
}

function corriger(racine: ParentNode) {
  for (const [sel, nom] of NOMS)
    racine.querySelectorAll(sel).forEach((el) => {
      if (sansNom(el)) el.setAttribute('aria-label', nom)
    })
  // Bouton « Ajouter » d'une relation : l'enveloppe porte role="button" autour d'un vrai bouton (contrôles imbriqués).
  racine.querySelectorAll('.popup-button--custom[role="button"]').forEach((el) => {
    if (el.querySelector('button, a[href]')) {
      el.removeAttribute('role')
      el.removeAttribute('tabindex')
      el.removeAttribute('aria-label')
    }
  })
  // Boutons-icônes à infobulle : l'infobulle est masquée aux lecteurs d'écran, son texte devient le nom du bouton.
  racine.querySelectorAll('button.btn--has-tooltip').forEach((el) => {
    const bulle = el.querySelector('.tooltip-content')?.textContent?.trim()
    if (bulle && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) el.setAttribute('aria-label', bulle)
  })
  // Listes déroulantes (react-select) et champ date : relier le champ à l'étiquette affichée au-dessus.
  racine.querySelectorAll('input.rs__input, .react-datepicker__input-container input').forEach((el) => {
    if (el.getAttribute('aria-labelledby') || el.getAttribute('aria-label')) return
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return
    const id = etiquette(el)
    if (id) el.setAttribute('aria-labelledby', id)
    else {
      const indice = el.closest('.rs__control')?.querySelector('.rs__placeholder')?.textContent?.trim()
      el.setAttribute('aria-label', indice || 'Choisir une valeur')
    }
  })
  // Éditeur de texte riche (Lexical) : zone de saisie reliée à l'étiquette du champ.
  racine.querySelectorAll('.ContentEditable__root').forEach((el) => {
    if (el.getAttribute('aria-labelledby') || el.getAttribute('aria-label')) return
    const id = etiquette(el)
    if (id) el.setAttribute('aria-labelledby', id)
    else el.setAttribute('aria-label', 'Contenu')
  })
  // Indicateurs de react-select masqués aux lecteurs d'écran : ils ne doivent pas non plus recevoir le focus.
  racine.querySelectorAll('.rs__indicators [aria-hidden="true"]').forEach((el) => {
    if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1')
  })
  // Onglets du document : <ul> dont les enfants sont des liens et des boutons, sans <li>.
  racine.querySelectorAll('ul.doc-tabs__tabs:not([role])').forEach((el) => {
    el.setAttribute('role', 'group')
    el.setAttribute('aria-label', 'Vues du document')
  })
  // Aperçu SEO : lien d'illustration vide tant que le titre n'est pas saisi (aperçu non cliquable).
  racine.querySelectorAll('a[href]').forEach((el) => {
    if (sansNom(el) && !el.querySelector('img, svg') && el.getAttribute('aria-hidden') !== 'true') {
      el.setAttribute('aria-hidden', 'true')
      el.setAttribute('tabindex', '-1')
    }
  })
}

export const AccessibiliteNative = ({ children }: { children?: React.ReactNode }) => {
  useEffect(() => {
    let attente = 0
    const planifier = () => {
      if (attente) return
      attente = window.requestAnimationFrame(() => {
        attente = 0
        corriger(document)
      })
    }
    corriger(document)
    // Marqueur pour les tests d’accessibilité : les corrections sont actives sur la page.
    document.documentElement.dataset.a11yNatif = 'actif'
    const obs = new MutationObserver(planifier)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => {
      obs.disconnect()
      if (attente) window.cancelAnimationFrame(attente)
    }
  }, [])
  return <>{children}</>
}
