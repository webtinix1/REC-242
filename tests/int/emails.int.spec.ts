import { describe, expect, it } from 'vitest'

import { TEMPLATES, TEMPLATE_KEYS } from '@/emails/defaults'
import { renderEmail } from '@/emails/render'

describe('E-mails', () => {
  it('remplace les variables et crée le bouton', () => {
    const t = TEMPLATES.invitationAdmin
    const r = renderEmail(t.objet, t.corps, { prenom: 'Eve', invitant: 'Ange Mouandza', role: 'Administrateur', lien: 'https://rec242.cg/admin/reset/abc' })
    expect(r.subject).toBe('Vous êtes invité(e) à l’administration du site REC 242')
    expect(r.html).toContain('href="https://rec242.cg/admin/reset/abc"')
    expect(r.html).toContain('Créer mon mot de passe')
    expect(r.text).toContain('Bonjour Eve,')
    expect(r.html).not.toContain('{{')
  })

  it('retire un passage conditionnel sans valeur', () => {
    const t = TEMPLATES.evenementAnnuleReporte
    const r = renderEmail(t.objet, t.corps, { evenement: 'Afterwork', annule_ou_reporte: 'annulé', message_organisateur: 'Nous sommes désolés.' })
    expect(r.text).not.toContain('Nouvelle date')
  })

  it('échappe le HTML des valeurs', () => {
    const r = renderEmail('Objet', 'Bonjour {{prenom}}', { prenom: '<script>x</script>' })
    expect(r.html).not.toContain('<script>x')
  })

  it('n’utilise jamais de tiret cadratin et déclare toutes ses variables', () => {
    for (const k of TEMPLATE_KEYS) {
      const t = TEMPLATES[k]
      expect(t.objet + t.corps).not.toContain('—')
      const used = [...(t.objet + t.corps).matchAll(/\{\{([a-z0-9_]+)\}\}/gi)].map((m) => m[1])
      for (const v of used) expect(t.variables, `${k} : ${v}`).toContain(v)
    }
  })
})
