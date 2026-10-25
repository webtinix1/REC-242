'use client'
import React, { useState } from 'react'

export type XPerson = {
  id: number
  nom: string
  ini: string
  photo?: string
  fonction: string
  role: string
  tags: string[]
}

/**
 * Filtre « Experts et référents par domaine » (écran 03) : « Tous » montre les experts du réseau,
 * une étiquette montre le comité et les experts qui la portent.
 */
export const ExpertsFilter = ({ people, tags }: { people: XPerson[]; tags: string[] }) => {
  const [tag, setTag] = useState('Tous')
  const list =
    tag === 'Tous'
      ? people.filter((p) => p.role === 'Expert du réseau')
      : people.filter((p) => p.tags.includes(tag))
  return (
    <>
      <div
        className="chips"
        role="group"
        aria-label="Filtrer par expertise"
        data-m="pops"
        data-m-stagger=""
      >
        {['Tous', ...tags].map((t) => (
          <button
            key={t}
            type="button"
            className={`chip${tag === t ? ' is-on' : ''}`}
            aria-pressed={tag === t}
            onClick={() => setTag(t)}
          >
            {t === 'Tous' ? 'Tous' : `#${t}`}
          </button>
        ))}
      </div>
      <p className="small muted" aria-live="polite">
        {list.length} personne(s) · {tag === 'Tous' ? 'les experts du réseau' : `#${tag}`}
      </p>
      <div className="g3" data-m="cascade" data-m-stagger="">
        {list.map((p) => (
          <div className="card xcard" key={p.id}>
            <div className="person">
              <div className="av av-photo">
                {p.ini}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.photo && <img src={p.photo} alt={p.nom} loading="lazy" />}
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="h-s">{p.nom}</p>
                <p className="small muted">{p.fonction}</p>
              </div>
            </div>
            <span className="pill-type">{p.role}</span>
            <div className="tagrow">
              {p.tags.map((t) => (
                <span className="xtag" key={t}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
