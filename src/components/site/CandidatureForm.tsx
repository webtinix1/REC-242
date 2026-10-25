'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState, useTransition } from 'react'

import {
  envoyerCandidature,
  erreursEtape,
  verifierEtape1,
  type Donnees,
  type Erreurs,
} from '@/app/(site)/adherer/candidature/actions'
import { Piege } from './ContactForm'

export type CategorieVue = {
  valeur: string
  lettre: string
  nom: string
  convention?: boolean
  note?: string
  droit?: number
  cotisation?: number
  total?: number
  tranche?: number
  premier?: number
}

type Option = { value: string; label: string }

type Props = {
  jeton: string
  categorieInitiale?: string
  categories: CategorieVue[]
  localites: { id: number; nom: string }[]
  secteurs: { id: number; nom: string }[]
  options: {
    civilites: Option[]
    ages: Option[]
    formes: Option[]
    effectifs: Option[]
    anciennetes: Option[]
    objectifs: Option[]
    connuPar: Option[]
    autorisations: { name: string; label: string }[]
  }
  delaiMois: number
  liens: { statuts?: string; reglement?: string; charte?: string }
}

const ETAPES = ['Vous', 'Votre entreprise', 'Votre projet', 'Paiement', 'Validation']
const CLE = 'rec242-candidature'
const MESSAGE_SECTEURS = 'Trois secteurs au maximum. Retirez-en un pour en choisir un autre.'
const DOUBLON =
  "Une demande d'adhésion est déjà enregistrée avec ces coordonnées. Veuillez contacter l'administration si vous pensez qu'il s'agit d'une erreur."

const fcfa = (n?: number) =>
  n == null ? '' : `${n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`

/** Écran 10 : candidature en cinq étapes. Brouillon enregistré sur l'appareil (sans les fichiers). */
export const CandidatureForm = (p: Props) => {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [d, setD] = useState<Donnees>(() => ({
    civilite: 'madame',
    trancheAge: '',
    formeJuridique: 'informelle',
    effectif: 'porteur',
    localite: p.localites[0]?.id,
    secteurs: [],
    objectifs: [],
    anciennete: '',
    connuPar: 'membre',
    categorie: p.categories.some((c) => c.valeur === p.categorieInitiale)
      ? p.categorieInitiale
      : 'B',
    modalite: 'une-fois',
    modePaiement: 'mobile',
    operateur: 'mtn',
    autorisations: { annuaire: true, coordonnees: true, logo: true, portrait: false },
  }))
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [doublon, setDoublon] = useState(false)
  const [general, setGeneral] = useState('')
  const [enCours, startTransition] = useTransition()
  const carte = useRef<HTMLDivElement>(null)
  const fichiers = useRef<HTMLInputElement>(null)
  const charge = useRef(false)

  // Reprise du brouillon enregistré sur l'appareil (la catégorie de l'adresse reste prioritaire).
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(CLE) || 'null') as {
        d?: Donnees
        etape?: number
      } | null
      // Le stockage de l'appareil n'existe qu'au navigateur : la reprise se fait après le premier rendu.
      /* eslint-disable react-hooks/set-state-in-effect */
      if (b?.d)
        setD((x) => ({ ...x, ...b.d, ...(p.categorieInitiale ? { categorie: x.categorie } : {}) }))
      if (b?.etape) setEtape(Math.min(5, Math.max(1, b.etape)))
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // brouillon illisible : ignoré
    }
    charge.current = true
  }, [p.categorieInitiale])

  useEffect(() => {
    if (!charge.current) return
    try {
      localStorage.setItem(CLE, JSON.stringify({ d, etape }))
    } catch {
      // stockage indisponible (navigation privée) : pas de brouillon
    }
  }, [d, etape])

  // Après une erreur : focus sur le premier champ en erreur.
  useEffect(() => {
    const el = carte.current?.querySelector<HTMLElement>('[aria-invalid="true"], .errbox')
    if (el) {
      el.focus?.()
      if (!el.matches('input,select,textarea')) el.scrollIntoView({ block: 'center' })
    }
  }, [erreurs, doublon])

  const maj = <K extends keyof Donnees>(k: K, v: Donnees[K]) => {
    setD((x) => ({ ...x, [k]: v }))
    if (erreurs[k as string]) setErreurs((e) => ({ ...e, [k]: '' }))
  }
  const cat = p.categories.find((c) => c.valeur === d.categorie) ?? p.categories[1]
  const deux = d.modalite === 'deux-tranches'
  const aPayer = cat.convention ? undefined : deux ? cat.premier : cat.total
  const operateur = d.operateur === 'airtel' ? 'Airtel Money' : 'MTN MoMo'

  const allerA = (n: number) => {
    setEtape(n)
    setErreurs({})
    setGeneral('')
    window.scrollTo({ top: 0 })
  }

  const continuer = () =>
    startTransition(async () => {
      setGeneral('')
      if (etape === 1) {
        const r = await verifierEtape1(d)
        if (r.erreurs) return setErreurs(r.erreurs)
        if (r.limite)
          return setGeneral(
            'Trop de vérifications depuis cet appareil. Réessayez dans une heure ou écrivez-nous sur WhatsApp.',
          )
        setDoublon(Boolean(r.doublon))
        if (r.doublon) return
      } else {
        const e = await erreursEtape(d, etape)
        if (Object.keys(e).length) return setErreurs(e)
      }
      allerA(etape + 1)
    })

  const envoyer = () =>
    startTransition(async () => {
      const e = await erreursEtape(d, 5)
      if (Object.keys(e).length) return setErreurs(e)
      const f = new FormData()
      f.set('donnees', JSON.stringify(d))
      f.set('jeton', p.jeton)
      f.set(
        'site_web',
        (document.getElementById('site_web') as HTMLInputElement | null)?.value ?? '',
      )
      for (const x of Array.from(fichiers.current?.files ?? [])) f.append('pieces', x)
      const r = await envoyerCandidature(f)
      if (r.ok) {
        try {
          localStorage.removeItem(CLE)
        } catch {
          // rien
        }
        router.push('/adherer/merci')
        return
      }
      if (r.doublon) {
        setDoublon(true)
        return allerA(1)
      }
      if (r.erreurs) {
        if (r.etape && r.etape !== etape) setEtape(r.etape)
        return setErreurs(r.erreurs)
      }
      setGeneral(r.general ?? 'Votre candidature n’a pas pu être envoyée.')
    })

  const progress = Math.round(((etape - 1) / 5) * 100)

  const champ = (
    id: string,
    k: keyof Donnees,
    lib: string,
    extra: {
      type?: string
      placeholder?: string
      aide?: string
      full?: boolean
      auto?: string
      mode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
    } = {},
  ) => (
    <div
      className={`rec-field${extra.full ? ' full' : ''}${erreurs[k] ? ' rec-field--error-true' : ''}`}
    >
      <label htmlFor={id}>{lib}</label>
      <input
        id={id}
        className="rec-input"
        type={extra.type ?? 'text'}
        placeholder={extra.placeholder}
        autoComplete={extra.auto}
        inputMode={extra.mode}
        value={(d[k] as string | undefined) ?? ''}
        onChange={(e) => maj(k, e.target.value as never)}
        aria-invalid={Boolean(erreurs[k])}
        aria-describedby={erreurs[k] ? `${id}-e` : extra.aide ? `${id}-a` : undefined}
      />
      {extra.aide && (
        <span className="rec-help" id={`${id}-a`}>
          {extra.aide}
        </span>
      )}
      {erreurs[k] && (
        <span className="rec-error" id={`${id}-e`}>
          {erreurs[k]}
        </span>
      )}
    </div>
  )

  const liste = (
    id: string,
    k: keyof Donnees,
    lib: string,
    opts: Option[],
    vide?: string,
    full?: boolean,
  ) => (
    <div className={`rec-field${full ? ' full' : ''}${erreurs[k] ? ' rec-field--error-true' : ''}`}>
      <label htmlFor={id}>{lib}</label>
      <select
        id={id}
        className="rec-input"
        value={(d[k] as string | number | undefined) ?? ''}
        onChange={(e) =>
          maj(k, (k === 'localite' ? Number(e.target.value) : e.target.value) as never)
        }
        aria-invalid={Boolean(erreurs[k])}
      >
        {vide && <option value="">{vide}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {erreurs[k] && <span className="rec-error">{erreurs[k]}</span>}
    </div>
  )

  const retour = (
    <button
      type="button"
      className="rec-btn rec-btn--ghost"
      onClick={() => allerA(etape - 1)}
      disabled={enCours}
    >
      ← Retour
    </button>
  )
  const suite = (
    <button
      type="button"
      className="rec-btn rec-btn--primary"
      onClick={continuer}
      disabled={enCours}
    >
      {enCours ? 'Vérification…' : 'Continuer'}
    </button>
  )

  const opt = (
    on: boolean,
    onClick: () => void,
    titre: string,
    sous: React.ReactNode,
    mono?: boolean,
  ) => (
    <button
      type="button"
      className={`opt${on ? ' is-on' : ''}`}
      onClick={onClick}
      aria-pressed={on}
    >
      <span className="dot" />
      <span>
        <b>{titre}</b>
        <br />
        <span className={`small muted${mono ? ' mono' : ''}`}>{sous}</span>
      </span>
    </button>
  )

  return (
    <>
      <section
        className="band bg-night dark net phead"
        style={{ paddingBottom: 104 }}
        data-m="head"
      >
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="stack" style={{ gap: 18 }}>
            <Link href="/adherer" className="linkbtn" data-m="rise">
              ← Adhérer
            </Link>
            <div className="rec-row" style={{ justifyContent: 'space-between' }}>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <span className="mw">
                  <span>Ma</span>
                </span>{' '}
                <span className="mw">
                  <span>candidature</span>
                </span>
              </h1>
              <span className="small muted" data-m="rise" data-m-d="3">
                Brouillon enregistré sur cet appareil
              </span>
            </div>
            <div
              data-m="grow"
              data-m-d="3"
              className="progress"
              role="progressbar"
              aria-label="Avancement de la candidature"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <ol
              className="stepdots"
              data-m="pops"
              data-m-stagger=""
              data-m-d="4"
              style={{ listStyle: 'none', padding: 0, margin: 0 }}
            >
              {ETAPES.map((t, i) => (
                <li
                  key={t}
                  className={`stepdot${etape > i + 1 ? ' is-done' : etape === i + 1 ? ' is-on' : ''}`}
                  aria-current={etape === i + 1 ? 'step' : undefined}
                >
                  <i>{i + 1}</i>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <section className="band band-t0 ovis">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="stack">
            <div
              ref={carte}
              className="card overlap shadow"
              style={{ padding: 32, gap: 20 }}
              data-m="lift"
              data-m-d="3"
            >
              <Piege />
              {general && (
                <div className="errbox" role="alert" tabIndex={-1}>
                  <p>{general}</p>
                </div>
              )}

              {etape === 1 && (
                <>
                  <h2 className="h-m">Vous</h2>
                  {doublon && (
                    <div className="errbox" role="alert" tabIndex={-1}>
                      <b>Candidature déjà enregistrée</b>
                      <p>{DOUBLON}</p>
                    </div>
                  )}
                  <div className="form">
                    {liste('b-civ', 'civilite', 'Civilité', p.options.civilites)}
                    {champ('b-fn', 'fonction', 'Fonction dans l’entreprise', {
                      placeholder: 'Gérant, fondatrice…',
                    })}
                    {champ('b-nom', 'nom', 'Nom', { auto: 'family-name' })}
                    {champ('b-prenom', 'prenom', 'Prénom', { auto: 'given-name' })}
                    {champ('b-tel', 'telephone', 'Téléphone ou WhatsApp', {
                      type: 'tel',
                      placeholder: '+242',
                      aide: 'Format international, +242 par défaut.',
                      auto: 'tel',
                    })}
                    {champ('b-mail', 'email', 'E-mail', { type: 'email', auto: 'email' })}
                    {liste('b-age', 'trancheAge', 'Tranche d’âge', p.options.ages, 'Choisir')}
                    {champ('b-cni', 'pieceIdentite', 'Numéro de pièce d’identité', {
                      aide: 'Vérifiée en main propre lors du rendez-vous avec le comité de direction.',
                    })}
                  </div>
                  <div className="rec-row" style={{ justifyContent: 'flex-end' }}>
                    {suite}
                  </div>
                </>
              )}

              {etape === 2 && (
                <>
                  <h2 className="h-m">Votre entreprise</h2>
                  <div className="form">
                    {champ('b-rs', 'raisonSociale', 'Raison sociale ou nom du projet', {
                      full: true,
                    })}
                    {liste('b-fj', 'formeJuridique', 'Forme juridique', p.options.formes)}
                    {champ('b-rccm', 'rccm', 'Numéro RCCM', {
                      placeholder: 'Facultatif',
                      aide: 'Obligatoire ou non : à valider par le comité de direction.',
                    })}
                    {champ('b-an', 'anneeCreation', 'Année de création', { mode: 'numeric' })}
                    {liste('b-eff', 'effectif', 'Tranche d’effectif', p.options.effectifs)}
                    {liste(
                      'b-loc',
                      'localite',
                      'Localisation',
                      p.localites.map((l) => ({ value: String(l.id), label: l.nom })),
                    )}
                    {champ('b-qu', 'quartier', 'Quartier')}
                    <div
                      className={`rec-field full${erreurs.description ? ' rec-field--error-true' : ''}`}
                    >
                      <label htmlFor="b-desc">Décrivez votre activité ou votre projet</label>
                      <textarea
                        id="b-desc"
                        className="rec-input"
                        placeholder="Ce que vous faites, pour qui, depuis quand"
                        value={d.description ?? ''}
                        onChange={(e) => maj('description', e.target.value)}
                        aria-invalid={Boolean(erreurs.description)}
                      />
                      <span className="rec-help">
                        Pièce du dossier demandée par le règlement intérieur. Quelques lignes
                        suffisent.
                      </span>
                      {erreurs.description && (
                        <span className="rec-error">{erreurs.description}</span>
                      )}
                    </div>
                    {champ(
                      'b-serv',
                      'services',
                      'Compétences ou services que vous pouvez proposer au réseau',
                      { placeholder: 'Facultatif', full: true },
                    )}
                  </div>
                  <fieldset className="fs">
                    <legend className="h-s">
                      Secteurs d’activité{' '}
                      <span className="small muted">{d.secteurs?.length ?? 0} sur 3 maximum</span>
                    </legend>
                    <div className="chips">
                      {p.secteurs.map((s) => {
                        const on = d.secteurs?.includes(s.id) ?? false
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`chip${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            onClick={() => {
                              const l = d.secteurs ?? []
                              if (on)
                                maj(
                                  'secteurs',
                                  l.filter((x) => x !== s.id),
                                )
                              else if (l.length < 3) maj('secteurs', [...l, s.id])
                              else setErreurs((e) => ({ ...e, secteurs: MESSAGE_SECTEURS }))
                            }}
                          >
                            {s.nom}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                  {erreurs.secteurs && (
                    <p className="rec-error" role="alert">
                      {erreurs.secteurs}
                    </p>
                  )}
                  <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                    {retour}
                    {suite}
                  </div>
                </>
              )}

              {etape === 3 && (
                <>
                  <h2 className="h-m">Votre projet avec REC 242</h2>
                  <fieldset className="fs">
                    <legend className="h-s">Ancienneté dans l’activité</legend>
                    <div className="chips">
                      {p.options.anciennetes.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className={`chip${d.anciennete === o.value ? ' is-on' : ''}`}
                          aria-pressed={d.anciennete === o.value}
                          onClick={() => maj('anciennete', o.value)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {erreurs.anciennete && <span className="rec-error">{erreurs.anciennete}</span>}
                  </fieldset>
                  <fieldset className="fs">
                    <legend className="h-s">Ce que vous attendez du réseau</legend>
                    <div className="chips">
                      {p.options.objectifs.map((o) => {
                        const on = d.objectifs?.includes(o.value) ?? false
                        return (
                          <button
                            key={o.value}
                            type="button"
                            className={`chip${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            onClick={() =>
                              maj(
                                'objectifs',
                                on
                                  ? (d.objectifs ?? []).filter((x) => x !== o.value)
                                  : [...(d.objectifs ?? []), o.value],
                              )
                            }
                          >
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                    {erreurs.objectifs && <span className="rec-error">{erreurs.objectifs}</span>}
                  </fieldset>
                  <div className="form">
                    {liste(
                      'b-cc',
                      'connuPar',
                      'Comment avez-vous connu REC 242 ?',
                      p.options.connuPar,
                    )}
                    {champ('b-par', 'parrain', 'Parrain éventuel', {
                      placeholder: 'Nom d’un membre, facultatif',
                    })}
                  </div>
                  <fieldset className="fs">
                    <legend className="h-s">
                      Votre catégorie{' '}
                      <span className="small muted">cochez celle où vous vous reconnaissez</span>
                    </legend>
                    <div className="g3">
                      {p.categories.map((c) => (
                        <button
                          key={c.valeur}
                          type="button"
                          className={`catcard${d.categorie === c.valeur ? ' is-on' : ''}`}
                          onClick={() => maj('categorie', c.valeur)}
                          aria-pressed={d.categorie === c.valeur}
                          style={{ padding: 20 }}
                        >
                          <div className="letter" style={{ width: 40, height: 40, fontSize: 18 }}>
                            {c.lettre}
                          </div>
                          <span className="small">{c.nom}</span>
                          <span className="mono small muted">
                            {c.convention ? 'Sur convention' : fcfa(c.total)}
                          </span>
                        </button>
                      ))}
                    </div>
                    {cat.convention && cat.note && <p className="small muted">{cat.note}</p>}
                  </fieldset>
                  <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                    {retour}
                    {suite}
                  </div>
                </>
              )}

              {etape === 4 && (
                <>
                  <h2 className="h-m">Votre paiement</h2>
                  {cat.convention ? (
                    <div className="card-soft" style={{ padding: 20, gap: 8 }}>
                      <p className="h-s">Pas de paiement en ligne pour la catégorie {cat.nom}</p>
                      <p className="muted small">
                        {cat.note} Le comité de direction vous contacte après l’examen de votre
                        dossier pour préparer la convention.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="g2">
                        {opt(
                          d.modalite === 'une-fois',
                          () => maj('modalite', 'une-fois'),
                          'En une fois',
                          fcfa(cat.total),
                          true,
                        )}
                        {opt(
                          d.modalite === 'deux-tranches',
                          () => maj('modalite', 'deux-tranches'),
                          'En deux tranches',
                          `${fcfa(cat.premier)} puis ${fcfa(cat.tranche)} sous ${p.delaiMois} mois`,
                          true,
                        )}
                        {opt(
                          d.modePaiement === 'mobile',
                          () => maj('modePaiement', 'mobile'),
                          'Paiement mobile',
                          'MTN MoMo ou Airtel Money',
                        )}
                        {opt(
                          d.modePaiement === 'siege',
                          () => maj('modePaiement', 'siege'),
                          'Au siège',
                          'Lors du rendez-vous avec le comité de direction',
                        )}
                      </div>
                      {d.modePaiement === 'mobile' && (
                        <div className="momo">
                          <p className="h-s" style={{ fontSize: 16 }}>
                            Votre opérateur
                          </p>
                          <div className="g2">
                            {opt(
                              d.operateur === 'mtn',
                              () => maj('operateur', 'mtn'),
                              'MTN MoMo',
                              'Depuis un numéro MTN',
                            )}
                            {opt(
                              d.operateur === 'airtel',
                              () => maj('operateur', 'airtel'),
                              'Airtel Money',
                              'Depuis un numéro Airtel',
                            )}
                          </div>
                          {champ('b-momo', 'numeroPayeur', `Numéro ${operateur} qui va payer`, {
                            type: 'tel',
                            placeholder: '+242',
                            aide: `À l’envoi, une demande de validation de ${fcfa(aPayer)} s’affiche sur ce téléphone. Confirmez avec votre code secret : le reçu est émis aussitôt.`,
                          })}
                        </div>
                      )}
                      <div className="card-soft" style={{ padding: 20, gap: 4 }}>
                        <div className="line">
                          <span>
                            Catégorie {cat.lettre} · {cat.nom}
                          </span>
                          <b>{fcfa(cat.total)}</b>
                        </div>
                        <div className="line" style={{ borderBottom: 0, fontWeight: 600 }}>
                          <span>À payer maintenant</span>
                          <b>{fcfa(aPayer)}</b>
                        </div>
                      </div>
                      <p className="small muted">
                        Remboursement en cas de refus du dossier : règle à préciser par le comité de
                        direction. <span className="ex">À valider</span>
                      </p>
                      {(['modalite', 'modePaiement', 'operateur'] as const).map((k) =>
                        erreurs[k] ? (
                          <span className="rec-error" key={k}>
                            {erreurs[k]}
                          </span>
                        ) : null,
                      )}
                    </>
                  )}
                  <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                    {retour}
                    {suite}
                  </div>
                </>
              )}

              {etape === 5 && (
                <>
                  <h2 className="h-m">Vérifier et envoyer</h2>
                  <div className="recap">
                    <div className="recap-row">
                      <div>
                        <p className="small muted">Vous</p>
                        <p>
                          {d.prenom} {d.nom} · {d.telephone} · {d.email}
                        </p>
                      </div>
                      <button type="button" className="linkbtn" onClick={() => allerA(1)}>
                        Modifier
                      </button>
                    </div>
                    <div className="recap-row">
                      <div>
                        <p className="small muted">Votre entreprise</p>
                        <p>
                          {d.raisonSociale} · Secteurs :{' '}
                          {p.secteurs
                            .filter((s) => d.secteurs?.includes(s.id))
                            .map((s) => s.nom)
                            .join(', ') || 'Aucun'}
                        </p>
                      </div>
                      <button type="button" className="linkbtn" onClick={() => allerA(2)}>
                        Modifier
                      </button>
                    </div>
                    <div className="recap-row">
                      <div>
                        <p className="small muted">Votre projet</p>
                        <p>
                          {p.options.anciennetes.find((o) => o.value === d.anciennete)?.label} ·{' '}
                          {p.options.objectifs
                            .filter((o) => d.objectifs?.includes(o.value))
                            .map((o) => o.label)
                            .join(', ')}{' '}
                          · catégorie {cat.lettre}
                        </p>
                      </div>
                      <button type="button" className="linkbtn" onClick={() => allerA(3)}>
                        Modifier
                      </button>
                    </div>
                    <div className="recap-row">
                      <div>
                        <p className="small muted">Paiement</p>
                        <p>
                          {cat.convention
                            ? 'Sur convention · aucun paiement en ligne'
                            : `${deux ? 'En deux tranches' : 'En une fois'} · ${d.modePaiement === 'mobile' ? `Paiement mobile (${operateur})` : 'Au siège, lors du rendez-vous'} · ${fcfa(aPayer)} maintenant`}
                        </p>
                      </div>
                      <button type="button" className="linkbtn" onClick={() => allerA(4)}>
                        Modifier
                      </button>
                    </div>
                  </div>
                  <div className={`rec-field${erreurs.pieces ? ' rec-field--error-true' : ''}`}>
                    <label htmlFor="b-pj">Pièces justificatives (facultatif)</label>
                    <input
                      ref={fichiers}
                      id="b-pj"
                      className="rec-input"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ paddingTop: 10 }}
                      aria-invalid={Boolean(erreurs.pieces)}
                    />
                    <span className="rec-help">
                      Extrait RCCM, logo. PDF, JPG ou PNG, 5 Mo maximum.
                    </span>
                    {erreurs.pieces && <span className="rec-error">{erreurs.pieces}</span>}
                  </div>
                  <fieldset className="fs">
                    <legend className="h-s">
                      Visibilité et autorisations{' '}
                      <span className="small muted">modifiables à tout moment</span>
                    </legend>
                    <div className="stack" style={{ gap: 6 }}>
                      {p.options.autorisations.map((a) => {
                        const on = Boolean(d.autorisations?.[a.name])
                        return (
                          <button
                            key={a.name}
                            type="button"
                            className={`check${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            onClick={() =>
                              maj('autorisations', { ...d.autorisations, [a.name]: !on })
                            }
                          >
                            <span className="chk-box" aria-hidden="true" />
                            <span>{a.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                  <button
                    type="button"
                    className={`check${d.consentement ? ' is-on' : ''}`}
                    aria-pressed={Boolean(d.consentement)}
                    onClick={() => maj('consentement', !d.consentement)}
                  >
                    <span className="chk-box" aria-hidden="true" />
                    <span>
                      J’accepte que mes données soient traitées par REC 242 pour examiner ma
                      candidature et gérer mon adhésion.
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`check${d.acceptationTextes ? ' is-on' : ''}`}
                    aria-pressed={Boolean(d.acceptationTextes)}
                    onClick={() => maj('acceptationTextes', !d.acceptationTextes)}
                  >
                    <span className="chk-box" aria-hidden="true" />
                    <span>
                      J’ai lu les statuts, le règlement intérieur et la charte de l’adhérent, et je
                      m’engage à les respecter.
                    </span>
                  </button>
                  {(p.liens.statuts || p.liens.reglement || p.liens.charte) && (
                    <p className="small muted">
                      Lire :{' '}
                      {[
                        [p.liens.statuts, 'les statuts'],
                        [p.liens.reglement, 'le règlement intérieur'],
                        [p.liens.charte, 'la charte de l’adhérent'],
                      ]
                        .filter(([h]) => h)
                        .map(([h, t], i) => (
                          <React.Fragment key={t}>
                            {i > 0 && ' · '}
                            <a href={h} target="_blank" rel="noopener noreferrer">
                              {t}
                            </a>
                          </React.Fragment>
                        ))}
                    </p>
                  )}
                  {erreurs.consentement && (
                    <p className="rec-error" role="alert">
                      {erreurs.consentement}
                    </p>
                  )}
                  <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                    {retour}
                    <button
                      type="button"
                      className="rec-btn rec-btn--primary"
                      onClick={envoyer}
                      disabled={enCours}
                    >
                      {enCours ? 'Envoi…' : 'Envoyer ma candidature'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
