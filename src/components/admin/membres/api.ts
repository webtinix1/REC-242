/** Appels aux endpoints du back-office, l'un après l'autre (deux écritures simultanées sur une fiche s'écraseraient). */
const appel = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const j = (await r.json().catch(() => ({}))) as { errors?: { message: string }[]; message?: string } & Record<string, unknown>
  if (!r.ok) throw new Error(j.errors?.[0]?.message || j.message || 'L’action n’a pas abouti.')
  return j
}

let file: Promise<unknown> = Promise.resolve()
export const api = (url: string, init?: RequestInit) => {
  const suivant = file.catch(() => undefined).then(() => appel(url, init))
  if (init?.method && init.method !== 'GET') file = suivant
  return suivant
}
