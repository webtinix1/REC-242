import Link from 'next/link'
import React from 'react'

import { mediaAlt, mediaPos, mediaUrl, type Bouton, type Media } from '@/lib/site/payload'

/** Boutons d'une section, avec les classes de la maquette (premier bouton principal, second secondaire). */
export const Boutons = ({
  boutons,
  styles = ['rec-btn--primary', 'rec-btn--secondary'],
  className = 'rec-row',
  m,
}: {
  boutons?: Bouton[]
  styles?: string[]
  className?: string
  m?: Record<string, string | boolean>
}) =>
  boutons?.length ? (
    <div className={className} {...dataM(m)}>
      {boutons.map((b, i) => (
        <Link key={b.lien + i} href={b.lien} className={`rec-btn ${styles[i] ?? styles[styles.length - 1]}`}>
          {b.libelle}
        </Link>
      ))}
    </div>
  ) : null

/** Attributs data-m* du moteur d'animation. */
export const dataM = (m?: Record<string, string | boolean>) =>
  Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k === 'm' ? 'data-m' : `data-m-${k}`, v === true ? '' : v]))

export const Img = ({
  media,
  size = 'grande',
  alt,
  className,
  style,
  m,
  priority,
}: {
  media?: Media | number | null
  size?: 'vignette' | 'carte' | 'grande'
  alt?: string
  className?: string
  style?: React.CSSProperties
  m?: Record<string, string | boolean>
  priority?: boolean
}) => {
  const src = mediaUrl(media, size)
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? mediaAlt(media)}
      className={className}
      style={{ objectPosition: mediaPos(media), ...style }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      {...dataM(m)}
    />
  )
}
