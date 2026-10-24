'use client'
import { Link } from '@payloadcms/ui'
import React from 'react'

export const EmailTemplatesLink = () => (
  <p>
    <Link href="/admin/globals/emailTemplates" className="rec-btn rec-btn--secondary">
      Modifier les modèles d’e-mails
    </Link>
  </p>
)
