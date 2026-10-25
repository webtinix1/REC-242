'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type Resultat = { ok: boolean; nom?: string; message: string }
type Scan = { code: string; date: string }
type Detecteur = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetecteurClasse = new (o: { formats: string[] }) => Detecteur

const cle = (evenement: number) => `rec242:scans:${evenement}`
const lire = (evenement: number): Scan[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(cle(evenement)) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
const ecrire = (evenement: number, file: Scan[]) => {
  try {
    if (file.length) window.localStorage.setItem(cle(evenement), JSON.stringify(file))
    else window.localStorage.removeItem(cle(evenement))
  } catch {
    /* stockage indisponible */
  }
}
const post = async (url: string, corps: unknown) => {
  const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { errors?: { message: string }[] }
  if (!r.ok) throw Object.assign(new Error(j.errors?.[0]?.message || 'Le pointage n’a pas abouti.'), { serveur: true })
  return j
}

/** Pointage par QR code : caméra arrière si possible, saisie du code sinon, file d'attente hors connexion. */
export const Scanner = ({ evenement, onFermer, onPointage }: { evenement: number; onFermer: () => void; onPointage: () => void }) => {
  const video = useRef<HTMLVideoElement>(null)
  const dernier = useRef({ code: '', t: 0 })
  const [code, setCode] = useState('')
  const [resultat, setResultat] = useState<Resultat | null>(null)
  const [attente, setAttente] = useState(() => lire(evenement).length)
  const [camera, setCamera] = useState<'essai' | 'oui' | 'non'>(() => ((window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector && navigator.mediaDevices ? 'essai' : 'non'))
  const [sync, setSync] = useState(false)

  const synchroniser = useCallback(async () => {
    const file = lire(evenement)
    if (!file.length || !navigator.onLine) return
    setSync(true)
    try {
      await post('/api/registrations/synchroniser', { evenement, scans: file })
      ecrire(evenement, [])
      setAttente(0)
      setResultat({ ok: true, message: `${file.length} pointage(s) synchronisé(s).` })
      onPointage()
    } catch (e) {
      setResultat({ ok: false, message: (e as Error).message })
    } finally {
      setSync(false)
    }
  }, [evenement, onPointage])

  const envoyer = useCallback(
    async (brut: string) => {
      const c = brut.trim()
      if (!c) return
      const maintenant = Date.now()
      if (dernier.current.code === c && maintenant - dernier.current.t < 4000) return
      dernier.current = { code: c, t: maintenant }
      const date = new Date().toISOString()
      const hors = () => {
        const file = [...lire(evenement), { code: c, date }]
        ecrire(evenement, file)
        setAttente(file.length)
        setResultat({ ok: true, message: 'Enregistré, sera synchronisé' })
      }
      if (!navigator.onLine) return hors()
      try {
        const r = (await post('/api/registrations/pointer', { evenement, code: c })) as unknown as Resultat
        setResultat({ ok: Boolean(r.ok), nom: r.nom, message: r.message })
        if (r.ok) onPointage()
      } catch (e) {
        if ((e as { serveur?: boolean }).serveur) setResultat({ ok: false, message: (e as Error).message })
        else hors()
      }
    },
    [evenement, onPointage],
  )

  useEffect(() => {
    const enLigne = () => void synchroniser()
    window.addEventListener('online', enLigne)
    return () => window.removeEventListener('online', enLigne)
  }, [evenement, synchroniser])

  useEffect(() => {
    const Detecteur = (window as unknown as { BarcodeDetector?: DetecteurClasse }).BarcodeDetector
    if (!Detecteur || !navigator.mediaDevices?.getUserMedia) return
    let flux: MediaStream | undefined
    let stop = false
    let minuterie: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (stop || !video.current) return flux.getTracks().forEach((t) => t.stop())
        video.current.srcObject = flux
        await video.current.play()
        setCamera('oui')
        const d = new Detecteur({ formats: ['qr_code'] })
        const boucle = async () => {
          if (stop) return
          try {
            if (video.current && video.current.readyState >= 2) {
              const trouves = await d.detect(video.current)
              if (trouves[0]?.rawValue) await envoyer(trouves[0].rawValue)
            }
          } catch {
            /* image illisible, on réessaie */
          }
          minuterie = setTimeout(boucle, 400)
        }
        void boucle()
      } catch {
        setCamera('non')
      }
    })()
    return () => {
      stop = true
      if (minuterie) clearTimeout(minuterie)
      flux?.getTracks().forEach((t) => t.stop())
    }
  }, [envoyer])

  return (
    <section className="panel scanp scan-full" role="dialog" aria-label="Pointage par QR code">
      <div className="scan-view">
        <video ref={video} className="scan-video" muted playsInline hidden={camera !== 'oui'} />
        {camera === 'oui' && (
          <>
            <span className="scan-frame" aria-hidden="true"></span>
            <span className="scan-line" aria-hidden="true"></span>
          </>
        )}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <h3 className="h3">Pointage par QR code</h3>
        <p className="small muted">
          {camera === 'oui'
            ? 'Visez le QR code de la carte de membre ou du billet. La présence est enregistrée aussitôt, même avec une connexion faible : la liste se synchronise dès que le réseau revient.'
            : camera === 'essai'
              ? 'Ouverture de la caméra…'
              : 'Caméra indisponible : saisissez le code, ou utilisez un lecteur de QR code qui le tape suivi de la touche Entrée.'}
        </p>
        <form
          className="rec-field"
          onSubmit={(e) => {
            e.preventDefault()
            void envoyer(code)
            setCode('')
          }}
        >
          <label htmlFor="scan-code">Saisir le code</label>
          <input id="scan-code" className="rec-input" type="text" autoComplete="off" autoCapitalize="off" value={code} onChange={(e) => setCode(e.target.value)} />
        </form>
        <div aria-live="polite">
          {resultat && (
            <div className={resultat.ok ? 'ok' : 'err'} role="status">
              {resultat.nom ? `${resultat.nom} · ` : ''}
              {resultat.message}
            </div>
          )}
        </div>
        <p className="small">
          <b>{attente}</b> pointage(s) en attente de synchronisation
        </p>
        <div className="rec-row">
          {attente > 0 && (
            <button type="button" className="rec-btn rec-btn--secondary" disabled={sync} onClick={() => void synchroniser()}>
              Synchroniser
            </button>
          )}
          <button type="button" className="linkbtn" onClick={onFermer}>
            Fermer le scanner
          </button>
        </div>
      </div>
    </section>
  )
}
