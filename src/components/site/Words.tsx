import React from 'react'

/** Titre découpé en mots pour l'animation « words » de la maquette (le texte reste lisible sans JavaScript). */
export const Words = ({ text }: { text?: string }) => (
  <>
    {(text ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i, a) => (
        <React.Fragment key={i}>
          <span className="mw">
            <span>{w}</span>
          </span>
          {i < a.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
  </>
)
