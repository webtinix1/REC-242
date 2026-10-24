import { notFound } from 'next/navigation'

// Planche de contrôle des composants de base (lot 0). Disponible seulement en développement.
export const metadata = { title: 'Composants', robots: { index: false } }

export default function Composants() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="rec-pad rec-stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1>Composants</h1>
      <div className="rec-rule rec-rule--short" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <h2>Boutons</h2>
      <div className="rec-row">
        <button type="button" className="rec-btn rec-btn--primary">Adhérer</button>
        <button type="button" className="rec-btn rec-btn--accent">Je m&apos;inscris</button>
        <button type="button" className="rec-btn rec-btn--secondary">Découvrir le réseau</button>
        <button type="button" className="rec-btn rec-btn--ghost">Voir l&apos;agenda</button>
        <button type="button" className="rec-btn rec-btn--primary" disabled>
          Désactivé
        </button>
      </div>

      <h2>Statuts et étiquettes</h2>
      <div className="rec-row">
        <span className="rec-badge rec-badge--active">Actif</span>
        <span className="rec-badge rec-badge--pending">En attente</span>
        <span className="rec-badge rec-badge--suspended">Suspendu</span>
        <span className="rec-tag">Catégorie B</span>
      </div>

      <h2>Champs</h2>
      <div className="rec-row" style={{ alignItems: 'flex-start' }}>
        <div className="rec-field">
          <label htmlFor="c-email">E-mail</label>
          <input id="c-email" className="rec-input" type="email" placeholder="vous@entreprise.cg" />
          <span className="rec-help">Votre identifiant de connexion.</span>
        </div>
        <div className="rec-field rec-field--error">
          <label htmlFor="c-tel">Téléphone ou WhatsApp</label>
          <input id="c-tel" className="rec-input" type="tel" defaultValue="06 12" aria-invalid="true" aria-describedby="c-tel-err" />
          <span id="c-tel-err" className="rec-error">Numéro incomplet. Format international, +242 par défaut.</span>
        </div>
      </div>

      <h2>Carte d&apos;événement</h2>
      <article className="rec-event">
        <div className="rec-event__date">
          <b>14</b>
          <span>nov.</span>
        </div>
        <div>
          <span className="rec-tag">Afterwork</span>
          <h3>Afterwork des entrepreneurs de Brazzaville</h3>
          <p>Siège de REC 242, Centre-Ville · 18 h</p>
          <span className="rec-badge rec-badge--active">18 places restantes</span>
        </div>
      </article>

      <h2>Carte de membre</h2>
      <article className="rec-member">
        <div className="rec-rule" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="rec-member__body">
          <div>
            <span className="rec-badge rec-badge--active">Actif</span>
            <p className="rec-member__name">Christelle Malonga</p>
            <p className="rec-member__meta">Kimia Créations · catégorie B</p>
            <span className="rec-member__id">REC-2026-0137</span>
          </div>
          <div className="rec-member__qr" aria-label="QR code de démonstration">
            <svg viewBox="0 0 5 5" aria-hidden="true">
              <rect x="0" y="0" width="2" height="2" />
              <rect x="3" y="0" width="2" height="2" />
              <rect x="0" y="3" width="2" height="2" />
              <rect x="3" y="3" width="1" height="1" />
              <rect x="2" y="2" width="1" height="1" />
            </svg>
          </div>
        </div>
      </article>
    </main>
  )
}
