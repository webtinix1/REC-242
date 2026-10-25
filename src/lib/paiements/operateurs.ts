import { randomUUID } from 'crypto'

/**
 * Paiement mobile (docs/02-architecture.md, « Paiements ») : MTN MoMo (API Collection, « request to pay »)
 * et Airtel Money (API Collection). Environnement de test d'abord ; les comptes marchands sont à obtenir par REC 242.
 *
 * Variables d'environnement (voir .env.example) :
 * - PAIEMENT_MODE : « simulation » (défaut, aucun appel externe), « test » (bacs à sable des opérateurs) ou « production ».
 * - MTN : MTN_SUBSCRIPTION_KEY, MTN_API_USER, MTN_API_KEY, MTN_TARGET_ENV, MTN_CURRENCY, MTN_BASE_URL.
 * - Airtel : AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET, AIRTEL_COUNTRY, AIRTEL_CURRENCY, AIRTEL_BASE_URL.
 *
 * Le rappel de l'opérateur (route /api/paiements/[operateur]) ne fait jamais foi à lui seul : le statut est toujours
 * relu auprès de l'opérateur avant de marquer un paiement comme payé.
 */

export type Operateur = 'mtn' | 'airtel'
export type StatutOperateur = 'paye' | 'echoue' | 'en-attente'

export type Demande = {
  montant: number
  telephone: string
  reference: string
  libelle: string
}

const env = (k: string) => process.env[k]?.trim() || ''

export const modePaiement = (op: Operateur): 'simulation' | 'test' | 'production' | 'indisponible' => {
  // En production, la simulation n'est jamais choisie par défaut : il faut la demander (préproduction) ou fournir les clés.
  const mode = env('PAIEMENT_MODE') || (process.env.NODE_ENV === 'production' ? 'production' : 'simulation')
  if (mode === 'simulation') return 'simulation'
  const cles = op === 'mtn' ? env('MTN_SUBSCRIPTION_KEY') && env('MTN_API_USER') && env('MTN_API_KEY') : env('AIRTEL_CLIENT_ID') && env('AIRTEL_CLIENT_SECRET')
  if (!cles) return mode === 'production' ? 'indisponible' : 'simulation'
  return mode === 'production' ? 'production' : 'test'
}

const urlRappel = (op: Operateur) => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/api/paiements/${op}`

/* ---------------------------------------------------------------- MTN MoMo */

const mtnBase = () =>
  env('MTN_BASE_URL') || (modePaiement('mtn') === 'production' ? 'https://proxy.momoapi.mtn.com' : 'https://sandbox.momodeveloper.mtn.com')

let mtnJeton: { valeur: string; expire: number } | null = null

async function mtnToken(): Promise<string> {
  if (mtnJeton && mtnJeton.expire > Date.now() + 30_000) return mtnJeton.valeur
  const r = await fetch(`${mtnBase()}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env('MTN_API_USER')}:${env('MTN_API_KEY')}`).toString('base64')}`,
      'Ocp-Apim-Subscription-Key': env('MTN_SUBSCRIPTION_KEY'),
    },
  })
  if (!r.ok) throw new Error(`MTN MoMo : jeton refusé (${r.status})`)
  const j = (await r.json()) as { access_token: string; expires_in: number }
  mtnJeton = { valeur: j.access_token, expire: Date.now() + j.expires_in * 1000 }
  return j.access_token
}

const mtnEntetes = async () => ({
  Authorization: `Bearer ${await mtnToken()}`,
  'X-Target-Environment': env('MTN_TARGET_ENV') || 'sandbox',
  'Ocp-Apim-Subscription-Key': env('MTN_SUBSCRIPTION_KEY'),
})

/** MSISDN sans « + » : 242067257950. */
const msisdn = (tel: string) => tel.replace(/\D/g, '')

async function mtnDemander(d: Demande): Promise<string> {
  const id = randomUUID()
  const r = await fetch(`${mtnBase()}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: { ...(await mtnEntetes()), 'X-Reference-Id': id, 'X-Callback-Url': urlRappel('mtn'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: String(d.montant),
      currency: env('MTN_CURRENCY') || (modePaiement('mtn') === 'production' ? 'XAF' : 'EUR'),
      externalId: d.reference,
      payer: { partyIdType: 'MSISDN', partyId: msisdn(d.telephone) },
      payerMessage: d.libelle.slice(0, 160),
      payeeNote: d.reference,
    }),
  })
  if (r.status !== 202) throw new Error(`MTN MoMo : demande refusée (${r.status})`)
  return id
}

async function mtnStatut(id: string): Promise<{ statut: StatutOperateur; detail: unknown }> {
  const r = await fetch(`${mtnBase()}/collection/v1_0/requesttopay/${id}`, { headers: await mtnEntetes() })
  if (!r.ok) return { statut: 'en-attente', detail: { http: r.status } }
  const j = (await r.json()) as { status?: string; financialTransactionId?: string }
  return { statut: j.status === 'SUCCESSFUL' ? 'paye' : j.status === 'FAILED' || j.status === 'REJECTED' ? 'echoue' : 'en-attente', detail: j }
}

/* ------------------------------------------------------------ Airtel Money */

const airtelBase = () =>
  env('AIRTEL_BASE_URL') || (modePaiement('airtel') === 'production' ? 'https://openapi.airtel.africa' : 'https://openapiuat.airtel.africa')

let airtelJeton: { valeur: string; expire: number } | null = null

async function airtelToken(): Promise<string> {
  if (airtelJeton && airtelJeton.expire > Date.now() + 30_000) return airtelJeton.valeur
  const r = await fetch(`${airtelBase()}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body: JSON.stringify({ client_id: env('AIRTEL_CLIENT_ID'), client_secret: env('AIRTEL_CLIENT_SECRET'), grant_type: 'client_credentials' }),
  })
  if (!r.ok) throw new Error(`Airtel Money : jeton refusé (${r.status})`)
  const j = (await r.json()) as { access_token: string; expires_in: number | string }
  airtelJeton = { valeur: j.access_token, expire: Date.now() + Number(j.expires_in) * 1000 }
  return j.access_token
}

const airtelEntetes = async () => ({
  Authorization: `Bearer ${await airtelToken()}`,
  'X-Country': env('AIRTEL_COUNTRY') || 'CG',
  'X-Currency': env('AIRTEL_CURRENCY') || 'XAF',
  'Content-Type': 'application/json',
  Accept: '*/*',
})

async function airtelDemander(d: Demande): Promise<string> {
  const id = randomUUID().replace(/-/g, '').slice(0, 20)
  const pays = env('AIRTEL_COUNTRY') || 'CG'
  const devise = env('AIRTEL_CURRENCY') || 'XAF'
  // Airtel attend le numéro sans indicatif pays.
  const numero = msisdn(d.telephone).replace(/^242/, '')
  const r = await fetch(`${airtelBase()}/merchant/v1/payments/`, {
    method: 'POST',
    headers: await airtelEntetes(),
    body: JSON.stringify({
      reference: d.libelle.slice(0, 60),
      subscriber: { country: pays, currency: devise, msisdn: numero },
      transaction: { amount: d.montant, country: pays, currency: devise, id },
    }),
  })
  if (!r.ok) throw new Error(`Airtel Money : demande refusée (${r.status})`)
  return id
}

async function airtelStatut(id: string): Promise<{ statut: StatutOperateur; detail: unknown }> {
  const r = await fetch(`${airtelBase()}/standard/v1/payments/${id}`, { headers: await airtelEntetes() })
  if (!r.ok) return { statut: 'en-attente', detail: { http: r.status } }
  const j = (await r.json()) as { data?: { transaction?: { status?: string; airtel_money_id?: string } } }
  const s = j.data?.transaction?.status
  return { statut: s === 'TS' ? 'paye' : s === 'TF' || s === 'TE' ? 'echoue' : 'en-attente', detail: j }
}

/* ------------------------------------------------------------- Simulation */

/**
 * Simulation (développement, recette sans comptes marchands) : la demande est acceptée et le paiement
 * est confirmé 5 secondes plus tard ; un numéro qui se termine par 0 simule un refus.
 */
const simulations = new Map<string, { telephone: string; depuis: number }>()

function simulationDemander(d: Demande): string {
  const id = `SIM-${randomUUID()}`
  simulations.set(id, { telephone: d.telephone, depuis: Date.now() })
  return id
}

function simulationStatut(id: string, telephone?: string, creeLe?: string): { statut: StatutOperateur; detail: unknown } {
  const s = simulations.get(id) ?? { telephone: telephone ?? '', depuis: creeLe ? new Date(creeLe).getTime() : 0 }
  if (Date.now() - s.depuis < 5000) return { statut: 'en-attente', detail: { simulation: true } }
  return { statut: s.telephone.trim().endsWith('0') ? 'echoue' : 'paye', detail: { simulation: true } }
}

/* ------------------------------------------------------------------ Accès */

export async function demanderPaiement(op: Operateur, d: Demande): Promise<{ id: string; mode: string }> {
  const mode = modePaiement(op)
  if (mode === 'indisponible') throw new Error('Paiement mobile indisponible : comptes marchands non configurés.')
  if (mode === 'simulation') return { id: simulationDemander(d), mode }
  return { id: op === 'mtn' ? await mtnDemander(d) : await airtelDemander(d), mode }
}

export async function statutPaiement(
  op: Operateur,
  id: string,
  contexte: { telephone?: string; creeLe?: string } = {},
): Promise<{ statut: StatutOperateur; detail: unknown }> {
  if (id.startsWith('SIM-')) {
    // Un identifiant de simulation n'est jamais validé hors simulation.
    if (modePaiement(op) !== 'simulation') return { statut: 'echoue', detail: { simulation: 'refusée hors mode simulation' } }
    return simulationStatut(id, contexte.telephone, contexte.creeLe)
  }
  return op === 'mtn' ? mtnStatut(id) : airtelStatut(id)
}
