import type { Payload, PayloadRequest } from 'payload'

import type { AuditCategory } from '@/collections/AuditLog'
import { clientCity, clientIp } from './request'

type Author =
  | { type: 'utilisateur'; id?: number | string; nom: string }
  | { type: 'membre'; nom: string }
  | { type: 'systeme' }
  | { type: 'visiteur'; nom?: string }

const authorFromReq = (req?: PayloadRequest | null): Author => {
  const u = req?.user as
    { id?: number | string; collection?: string; name?: string; email?: string } | null | undefined
  if (!u) return { type: 'systeme' }
  if (u.collection === 'users')
    return { type: 'utilisateur', id: u.id, nom: u.name || u.email || '' }
  return { type: 'membre', nom: u.name || u.email || '' }
}

/**
 * Inscrit une action au journal. Ne lève jamais d'erreur : le journal ne doit pas bloquer l'action elle-même.
 * Par défaut l'écriture se fait dans la transaction de la requête (sinon verrou sur la ligne de l'utilisateur
 * pendant la connexion). `detached: true` écrit hors transaction, pour tracer une tentative échouée.
 */
export const logAction = async (
  payload: Payload,
  args: {
    categorie: AuditCategory
    action: string
    cible?: string
    req?: PayloadRequest | null
    author?: Author
    detached?: boolean
  },
): Promise<void> => {
  const author = args.author ?? authorFromReq(args.req)
  try {
    await payload.create({
      collection: 'auditLog',
      overrideAccess: true,
      req: args.detached ? undefined : (args.req ?? undefined),
      data: {
        action: args.action,
        categorie: args.categorie,
        cible: args.cible,
        auteurType: author.type,
        auteur: author.type === 'utilisateur' && author.id ? (author.id as number) : undefined,
        auteurNom:
          author.type === 'systeme' ? 'Système' : ('nom' in author ? author.nom : '') || '',
        ip: clientIp(args.req),
        ville: clientCity(args.req),
      },
    })
  } catch (err) {
    payload.logger.error({ err }, 'Impossible d’écrire dans le journal des actions')
  }
}
