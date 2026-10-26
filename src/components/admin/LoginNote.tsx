import React from 'react'

/** Textes de la page de connexion (maquette, écran 01) : pastille, accès réservé, titre de la page. */
export const BeforeLogin = () => (
  <>
    <span className="rec-login-pill">Back-office</span>
    <p className="rec-login-small">
      Accès réservé aux comptes d&apos;administration de REC 242 et à Webtinix pour la maintenance.
      Chaque connexion est inscrite au journal des actions.
    </p>
    <h1 className="rec-login-h1">Connexion à l&apos;administration</h1>
  </>
)

export const AfterLogin = () => (
  <p className="rec-login-small">
    Après 5 tentatives échouées, le compte est bloqué 15 minutes. Une connexion depuis un nouvel
    appareil déclenche une alerte par e-mail. Déconnexion automatique après 30 minutes
    d&apos;inactivité.
  </p>
)
