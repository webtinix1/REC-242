'use client'
import React, { useState } from 'react'

/** Partage d'une page : WhatsApp, Facebook, LinkedIn, X et copie du lien (avec message de confirmation). */
export const Share = ({ url, titre }: { url: string; titre: string }) => {
  const [toast, setToast] = useState('')
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(titre)
  const liens = [
    ['WhatsApp', `https://wa.me/?text=${t}%20${u}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['X', `https://x.com/intent/post?url=${u}&text=${t}`],
  ]
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setToast('Lien copié dans le presse-papiers.')
    } catch {
      setToast('Copie impossible : sélectionnez l’adresse dans la barre du navigateur.')
    }
  }
  return (
    <>
      <div className="chips" data-m="pops" data-m-stagger="" data-m-d="2">
        {liens.map(([label, href]) => (
          <a key={label} className="chip" href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ))}
        <button type="button" className="chip" onClick={copier}>
          Copier le lien
        </button>
      </div>
      {toast && (
        <div className="toast" role="status">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
          <span>{toast}</span>
          <button type="button" className="linkbtn" onClick={() => setToast('')}>
            Fermer
          </button>
        </div>
      )}
    </>
  )
}
