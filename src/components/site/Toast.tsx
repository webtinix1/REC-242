'use client'
import React from 'react'

/** Bandeau de confirmation en bas d'écran (toast de la maquette). */
export const Toast = ({ message, onClose }: { message: string; onClose: () => void }) =>
  message ? (
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
      <span>{message}</span>
      <button type="button" className="linkbtn" onClick={onClose}>
        Fermer
      </button>
    </div>
  ) : null
