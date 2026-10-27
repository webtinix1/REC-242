import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { RichText } from '@/components/site/RichText'
import { Share } from '@/components/site/Share'
import { Words } from '@/components/site/Words'
import { isActiveMember, isStaff } from '@/access/roles'
import { evenementsPublics } from '@/lib/evenements/site'
import { dateLong } from '@/lib/site/format'
import { docHref, NEWS_TYPE_LABEL, type NewsItem } from '@/lib/site/data'
import { getPayloadClient, isPreview, mediaUrl } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor, siteUrl } from '@/lib/site/seo'

type Params = Promise<{ slug: string }>

type Article = NewsItem & {
  signature?: string
  aLireAussiTitre?: string | null
  aLireAussi?: {
    relationTo: 'news' | 'pages'
    value: { titre?: string; title?: string; slug?: string; chemin?: string } | number
  } | null
  updatedAt?: string
}

/** Actualité publiée, lue avec les droits du visiteur (le corps d'une actualité réservée n'est renvoyé qu'aux membres). */
async function load(slug: string) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const draft = await isPreview()
  const r = await payload.find({
    collection: 'news',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    draft,
    overrideAccess: draft,
    user,
  })
  return { doc: (r.docs[0] as unknown as Article) ?? null, user }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const { doc } = await load(slug)
  if (!doc) return {}
  return metadataFor(`/actualites/${slug}`, {
    title: doc.meta?.title || doc.titre,
    description: doc.meta?.description || doc.chapeau,
    image: doc.meta?.image || doc.image,
    type: 'article',
  })
}

/** Écran 20 : article. Une actualité réservée montre seulement son chapeau à un visiteur. */
export default async function Article({ params }: { params: Params }) {
  const { slug } = await params
  const { doc: n, user } = await load(slug)
  if (!n) notFound()
  const lecteur = isStaff(user) || isActiveMember(user)
  const verrou = n.reserveMembres && !lecteur
  const url = `${siteUrl()}/actualites/${n.slug}`
  const suite = n.aLireAussi && typeof n.aLireAussi.value !== 'number' ? n.aLireAussi : null
  const suiteHref = suite
    ? suite.relationTo === 'news'
      ? `/actualites/${(suite.value as { slug?: string }).slug}`
      : ((suite.value as { chemin?: string }).chemin ?? '/')
    : null
  const suiteTitre = suite
    ? n.aLireAussiTitre || ((suite.value as { titre?: string }).titre ?? (suite.value as { title?: string }).title)
    : null
  const [lie] = await evenementsPublics({ actualite: { equals: n.id } }, { limit: 1 })
  const pdf = n.pdf && typeof n.pdf !== 'number' ? n.pdf : null

  return (
    <>
      <section className="band bg-warm phead">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="stack" style={{ gap: 20 }}>
            <Link prefetch={false} href="/actualites" className="linkbtn" data-m="rise">
              ← Actualités
            </Link>
            <div className="rec-row" data-m="rise" data-m-d="1">
              <span className="pill-type">{NEWS_TYPE_LABEL[n.type]}</span>
              {n.reserveMembres && <span className="vis mem">Membres</span>}
              <span className="small muted">
                {dateLong(n.datePublication)}
                {n.signature ? ` · par ${n.signature}` : ''}
              </span>
            </div>
            <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
              <Words text={n.titre} />
            </h1>
            <p className="lead" style={{ color: '#171a17' }} data-m="rise" data-m-d="6">
              {n.chapeau}
            </p>
          </div>
        </div>
      </section>

      {verrou ? (
        <section className="band bg-white band-end">
          <div className="wrap art-body stack" style={{ gap: 20 }}>
            <div className="card-soft">
              <p className="h-s">Article réservé aux membres</p>
              <p className="muted">Connectez-vous à l’espace membre pour lire la suite.</p>
              <Link prefetch={false}
                href={`/espace-membre?suite=${encodeURIComponent(`/actualites/${n.slug}`)}`}
                className="rec-btn rec-btn--primary"
                style={{ width: 'max-content' }}
              >
                Se connecter à l’espace membre pour lire
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {n.image && typeof n.image !== 'number' ? (
            <figure className="fullimg art-cover" data-m="iris" data-m-d="3">
              <Img media={n.image} priority />
            </figure>
          ) : null}
          {(n.corps || pdf) && (
            <section className="band bg-white">
              <div
                className="wrap art-body stack"
                style={{ gap: 20 }}
                data-m="cascade"
                data-m-stagger=""
              >
                <RichText data={n.corps} />
                {pdf && (
                  <p>
                    <a className="rec-btn rec-btn--secondary" href={docHref(pdf)}>
                      Télécharger le communiqué (PDF)
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {((suite && suiteHref) || lie) && (
        <section className="band bg-night dark net net-soft band-s" data-m="bloom" data-m-scrub="">
          <div className="wrap" style={{ maxWidth: 900 }}>
            <div className="g2" data-m="deal" data-m-stagger="" data-m-d="3">
              {lie && (
                <Link prefetch={false} href={`/agenda/${lie.slug}`} className="card">
                  <span className="small muted">Événement lié</span>
                  <p className="h-s">{lie.titre}</p>
                </Link>
              )}
              {suite && suiteHref && (
                <Link prefetch={false} href={suiteHref} className="card">
                  <span className="small muted">À lire aussi</span>
                  <p className="h-s">{suiteTitre}</p>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="band bg-tint band-s band-end">
        <div className="wrap rec-row" style={{ justifyContent: 'space-between', maxWidth: 900 }}>
          <p className="h-m" data-m="rise">
            Partager cet article
          </p>
          <Share url={url} titre={n.titre} />
        </div>
      </section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: n.titre,
          description: n.chapeau,
          datePublished: n.datePublication,
          dateModified: n.updatedAt ?? n.datePublication,
          image: mediaUrl(n.image, 'grande') ? [mediaUrl(n.image, 'grande')] : undefined,
          isAccessibleForFree: !n.reserveMembres,
          author: { '@type': 'Organization', name: 'REC 242' },
          publisher: {
            '@type': 'Organization',
            name: 'REC 242',
            logo: { '@type': 'ImageObject', url: `${siteUrl()}/images/logo-rec242.jpg` },
          },
          mainEntityOfPage: url,
        }}
      />
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Actualités', chemin: '/actualites' },
          { nom: n.titre, chemin: `/actualites/${n.slug}` },
        ])}
      />
    </>
  )
}
