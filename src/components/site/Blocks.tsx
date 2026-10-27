import Link from 'next/link'
import React from 'react'

import { mediaAlt, mediaPos, mediaUrl, type Bouton, type Media } from '@/lib/site/payload'

/** Lien interne (navigation Next), externe (nouvel onglet) ou fichier (/api/…). */
export const Lnk = ({
  href,
  className,
  children,
  m,
  ...rest
}: {
  href: string
  className?: string
  children: React.ReactNode
  m?: Record<string, string | boolean>
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) => {
  const ext = /^https?:\/\//.test(href)
  if (ext || href.startsWith('/api/') || href.startsWith('mailto:') || href.startsWith('tel:'))
    return (
      <a
        href={href}
        className={className}
        {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...dataM(m)}
        {...rest}
      >
        {children}
      </a>
    )
  return (
    <Link prefetch={false} href={href} className={className} {...dataM(m)} {...rest}>
      {children}
    </Link>
  )
}

/** Boutons d'une section, avec les classes de la maquette (premier bouton principal, second secondaire). */
export const Boutons = ({
  boutons,
  styles = ['rec-btn--primary', 'rec-btn--secondary'],
  className = 'rec-row',
  m,
  style,
}: {
  boutons?: Bouton[]
  styles?: string[]
  className?: string
  m?: Record<string, string | boolean>
  style?: React.CSSProperties
}) =>
  boutons?.length ? (
    <div className={className} style={style} {...dataM(m)}>
      {boutons.map((b, i) => (
        <Lnk
          key={b.lien + i}
          href={b.lien}
          className={`rec-btn ${styles[i] ?? styles[styles.length - 1]}`}
        >
          {b.libelle}
        </Lnk>
      ))}
    </div>
  ) : null

/** Un seul bouton (le premier d'une section), utilisé dans les en-têtes de section. */
export const Btn = ({
  b,
  cls = 'rec-btn--secondary',
  style,
  m,
}: {
  b?: Bouton
  cls?: string
  style?: React.CSSProperties
  m?: Record<string, string | boolean>
}) =>
  b ? (
    <Lnk href={b.lien} className={`rec-btn ${cls}`} style={style} m={m}>
      {b.libelle}
    </Lnk>
  ) : null

/** Attributs data-m* du moteur d'animation. */
export const dataM = (m?: Record<string, string | boolean>) =>
  Object.fromEntries(
    Object.entries(m ?? {}).map(([k, v]) => [
      k === 'm' ? 'data-m' : `data-m-${k}`,
      v === true ? '' : v,
    ]),
  )

const WIDTHS = { vignette: 400, carte: 800, grande: 1600 } as const
const DEFAULT_SIZES = { vignette: '120px', carte: '(max-width: 768px) 100vw, 480px', grande: '(max-width: 768px) 200vw, 100vw' }

/** Tailles générées par la médiathèque (WebP), jusqu'à la taille demandée. */
const srcSetOf = (m: Media, size: keyof typeof WIDTHS): string | undefined => {
  const max = WIDTHS[size]
  const list = (Object.keys(WIDTHS) as (keyof typeof WIDTHS)[])
    .filter((k) => WIDTHS[k] <= max && m.sizes?.[k]?.url)
    .map((k) => `${m.sizes![k]!.url} ${m.sizes![k]!.width ?? WIDTHS[k]}w`)
  if (m.url && m.width && (!list.length || m.width <= max * 1.2 || !m.sizes?.[size]?.url))
    list.push(`${m.url} ${m.width}w`)
  return list.length > 1 ? list.join(', ') : undefined
}

export const Img = ({
  media,
  size = 'grande',
  alt,
  className,
  style,
  m,
  priority,
  sizes,
}: {
  media?: Media | number | null
  size?: 'vignette' | 'carte' | 'grande'
  alt?: string
  className?: string
  style?: React.CSSProperties
  m?: Record<string, string | boolean>
  priority?: boolean
  /** Largeur affichée, pour que le navigateur choisisse la bonne taille (srcset). */
  sizes?: string
}) => {
  const src = mediaUrl(media, size)
  if (!src) return null
  const srcSet = media && typeof media !== 'number' ? srcSetOf(media, size) : undefined
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? DEFAULT_SIZES[size]) : undefined}
      alt={alt ?? mediaAlt(media)}
      className={className}
      style={{ objectPosition: mediaPos(media), ...style }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      // Image au-dessus de la ligne de flottaison : déjà « révélée » au premier affichage (LCP),
      // l'animation CSS se joue dès le chargement sans attendre le moteur.
      {...dataM(priority && m?.m ? { ...m, in: true } : m)}
    />
  )
}

/** Mention « À valider » de la maquette. */
export const Ex = ({ children = 'À valider' }: { children?: React.ReactNode }) => (
  <span className="ex">{children}</span>
)

/** En-tête de section : surtitre, titre de niveau 2 et bouton éventuel. */
export const SecHead = ({
  surtitre,
  titre,
  bouton,
  btnCls,
  style,
  d,
  extra,
}: {
  surtitre?: string
  titre?: string
  bouton?: Bouton
  btnCls?: string
  style?: React.CSSProperties
  d?: string
  extra?: React.ReactNode
}) => (
  <div className="sec-head" style={style}>
    <div className="stack" style={{ gap: 10 }} data-m="rise" data-m-d={d}>
      {surtitre && <span className="eyebrow">{surtitre}</span>}
      {titre && <h2 className="h-l">{titre}</h2>}
    </div>
    {bouton && <Btn b={bouton} cls={btnCls} />}
    {extra}
  </div>
)

/** Disque photo ou initiales d'une personne. */
export const Avatar = ({
  nom,
  initiales,
  photo,
  className = 'av av-photo',
  m,
}: {
  nom: string
  initiales?: string
  photo?: Media | number | null
  className?: string
  m?: Record<string, string | boolean>
}) => (
  <div className={className} {...dataM(m)}>
    {initiales || initialesDe(nom)}
    <Img media={photo} size="vignette" alt={nom} />
  </div>
)

export const initialesDe = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

/** Disques des chiffres clés. */
export const KeyFigures = ({ figs }: { figs: { libelle: string; valeur: string }[] }) =>
  figs.length ? (
    <div className="kdisc-row" data-m="fill" data-m-stagger="">
      {figs.map((k) => (
        <div className="kdisc" key={k.libelle}>
          <b {...(/^\d+$/.test(k.valeur) && k.valeur.length < 4 ? { 'data-m-count': '' } : {})}>
            {k.valeur}
          </b>
          <span className="muted">{k.libelle}</span>
        </div>
      ))}
    </div>
  ) : null

/** Paragraphes d'un texte multiligne. */
export const Paras = ({ text, className }: { text?: string; className?: string }) =>
  text ? (
    <>
      {text.split(/\n+/).map((l, i) => (
        <p key={i} className={className}>
          {l}
        </p>
      ))}
    </>
  ) : null
