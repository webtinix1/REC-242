import React from 'react'

/** Données structurées schema.org (le JSON est échappé pour ne pas fermer la balise script). */
export const JsonLd = ({ data }: { data: unknown }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
  />
)
