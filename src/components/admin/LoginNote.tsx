import React from 'react'

/** Textes de la page de connexion (captures/back-office/01-connexion). */
export const BeforeLogin = () => (
  <div className="rec-login-intro">
    <p className="rec-login-kicker">Back-office</p>
    <p>
      Accès réservé aux comptes d&apos;administration de REC 242 et à Webtinix pour la maintenance.
      Chaque connexion est inscrite au journal des actions.
    </p>
  </div>
)

export const AfterLogin = () => (
  <p className="rec-login-note">
    Après 5 tentatives échouées, le compte est bloqué 15 minutes. Une connexion depuis un nouvel
    appareil déclenche une alerte par e-mail. Déconnexion automatique après 30 minutes
    d&apos;inactivité.
  </p>
)
