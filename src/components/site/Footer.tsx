import Link from 'next/link'
import React from 'react'

import { getNavigation, getSettings, linkHref, waLink } from '@/lib/site/settings'

export const Footer = async () => {
  const [nav, s] = await Promise.all([getNavigation(), getSettings()])
  const cols = nav.piedDePage ?? []
  const wa = waLink(s.whatsapp?.numero)
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="stack">
            <div className="plate">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-rec242.jpg" alt="REC 242" width={137} height={40} />
            </div>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 18, color: '#ffffff' }}>Se connecter. Entreprendre. Construire.</p>
            <div className="rec-rule rec-rule--short" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            {s.adresse && (
              <p className="small" style={{ color: '#cfe5d8' }}>
                {s.adresse}
              </p>
            )}
          </div>
          {cols.slice(0, 2).map((c) => (
            <div key={c.titre}>
              <h4>{c.titre}</h4>
              {(c.liens ?? []).map((l) => (
                <Link key={l.libelle} href={linkHref(l)}>
                  {l.libelle}
                </Link>
              ))}
            </div>
          ))}
          <div>
            <h4>{cols[2]?.titre ?? 'Nous joindre'}</h4>
            {wa && <a href={wa}>WhatsApp {s.whatsapp?.numero}</a>}
            {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
            {(cols[2]?.liens ?? []).map((l) => (
              <Link key={l.libelle} href={linkHref(l)}>
                {l.libelle}
              </Link>
            ))}
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} REC 242 · Réseau des Entrepreneurs Congolais</span>
          <span className="foot-links">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/conditions-utilisation">Conditions d&apos;utilisation</Link>
            <Link href="/plan-du-site">Plan du site</Link>
            <span>Site réalisé par Webtinix</span>
            <button type="button" className="m-toggle" data-m-toggle aria-pressed="false">
              <span className="m-on">Réduire les animations</span>
              <span className="m-off">Activer les animations</span>
            </button>
          </span>
        </div>
      </div>
    </footer>
  )
}
