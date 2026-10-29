/**
 * Les échanges entre membres restent sur la plateforme (décision de Webtinix du 28/10/2026) : numéros de téléphone,
 * adresses e-mail et liens de messagerie écrits dans un message sont remplacés, pour tout le monde, équipe comprise.
 * Appliqué par le serveur à l'enregistrement, puis de nouveau à l'affichage pour les messages plus anciens.
 *
 * La détection travaille sur une copie normalisée du texte (formes de compatibilité Unicode NFKC, caractères invisibles
 * et signes diacritiques combinants retirés, chiffres de toutes les écritures ramenés à 0-9, lettres O, o, l, I lues
 * comme des chiffres au milieu d'un numéro) ; le remplacement se fait sur le texte d'origine, qui reste intact ailleurs.
 *
 * Numéros : toute suite d'au moins 8 chiffres séparés par des signes autres que des lettres (espaces, points, barres,
 * tirets, virgules…, 8 au plus entre deux chiffres) est masquée en entier, sauf si elle se lit uniquement comme :
 * - des dates valides (jj/mm/aaaa, jj.mm.aaaa, jj-mm-aaaa, aaaa-mm-jj ; jour 1 à 31, mois 1 à 12, année 19xx ou 20xx),
 *   suivies au besoin d'une heure (« 12/11/2026 14:30 ») ;
 * - des années consécutives (« 2025-2026 ») ou des heures (« 14:30-16:00 ») ;
 * - des montants groupés par milliers : premier groupe de 1 à 3 chiffres ne commençant pas par 0, puis des groupes de
 *   exactement 3 chiffres, séparés par une espace ou un point, le dernier groupe valant « 000 », 10 chiffres au plus
 *   (« 10 000 000 », « 1.250.000 ») ; un montant écrit autrement compte comme un numéro dès 8 chiffres.
 *   Un numéro congolais (9 chiffres commençant par 0, ou indicatif 242) ne remplit jamais ces conditions, et un mot
 *   de devise (« FCFA », « F ») n'exempte rien ;
 * - au plus une année isolée et un petit nombre de 1 ou 2 chiffres (« En 2026, 50 000 FCFA », « salle 12, 12/11/2026 »).
 * Les éléments reconnus sont séparés par une virgule, un point-virgule ou un séparateur entouré d'espaces ; une suite
 * précédée d'un « + » est toujours un numéro. Les nombres écrits en toutes lettres (« zéro six soixante-six… ») sont
 * masqués quand au moins 3 nombres se suivent, dont 2 en lettres, et représentent 8 chiffres ou plus.
 */
export const COORDONNEE_MASQUEE = '[coordonnée masquée]'

type Plage = [number, number]

// --- Normalisation ---------------------------------------------------------------------------------------------------

// Caractères de mise en forme invisibles (espaces de largeur nulle, marques de direction, trait d'union conditionnel…).
const INVISIBLE = /[\p{Cf}͏ᅟᅠㅤﾠ]/u
const CHIFFRE = /\p{Nd}/u
const DIACRITIQUE = /\p{M}/gu

// Unicode range les chiffres de chaque écriture par blocs contigus de 0 à 9 : la valeur se lit depuis le début du bloc.
function valeurChiffre(cp: number): number {
  let z = cp
  while (z > 0 && CHIFFRE.test(String.fromCodePoint(z - 1))) z--
  return (cp - z) % 10
}

/** Texte normalisé et, pour chacune de ses positions, la plage correspondante dans le texte d'origine. */
function normaliser(texte: string): { n: string; debut: number[]; fin: number[] } {
  let n = ''
  const debut: number[] = []
  const fin: number[] = []
  let i = 0
  for (const c of texte) {
    const r = INVISIBLE.test(c) ? '' : CHIFFRE.test(c) ? String(valeurChiffre(c.codePointAt(0)!)) : c.normalize('NFKC').replace(DIACRITIQUE, '')
    for (let k = 0; k < r.length; k++) {
      debut.push(i)
      fin.push(i + c.length)
    }
    n += r
    i += c.length
  }
  return { n, debut, fin }
}

// « O6 6l2 34 56 » : dans un mot fait de chiffres et des lettres O, o, l, I, ces lettres valent 0 et 1 (même longueur).
const versChiffres = (s: string) => s.replace(/[Oo]/g, '0').replace(/[lI]/g, '1')
function lettresEnChiffres(n: string): string {
  return n
    .replace(/(?<!\p{L})[0-9OolI]*[0-9][0-9OolI]*(?!\p{L})/gu, versChiffres)
    .replace(/(?<=\d[^\p{L}\p{N}]{0,8})(?<!\p{L})[OolI](?!\p{L})(?=[^\p{L}\p{N}]{0,8}\d)/gu, versChiffres)
}

// --- Numéros de téléphone --------------------------------------------------------------------------------------------

const SUITE = /(?:\+[^\p{L}\p{N}]{0,2})?\d+(?:[^\p{L}\p{N}]{1,8}\d+)*/gu

type Jeton = { type: 'date' | 'heure' | 'annees' | 'montant' | 'annee' | 'petit'; fin: number }

const JOUR_MOIS = (j: number, m: number) => j >= 1 && j <= 31 && m >= 1 && m <= 12
const ANNEE = (a: string) => a.length === 2 || /^(?:19|20)\d\d$/.test(a)

function jeton(s: string, pos: number): Jeton | null {
  const essai = (re: RegExp) => {
    re.lastIndex = pos
    return re.exec(s)
  }
  let x = essai(/(\d{1,2})([./-])(\d{1,2})\2(\d{4}|\d{2})(?!\d)/y)
  if (x && JOUR_MOIS(Number(x[1]), Number(x[3])) && ANNEE(x[4])) return { type: 'date', fin: pos + x[0].length }
  x = essai(/((?:19|20)\d\d)-(\d{2})-(\d{2})(?!\d)/y)
  if (x && JOUR_MOIS(Number(x[3]), Number(x[2]))) return { type: 'date', fin: pos + x[0].length }
  x = essai(/((?:19|20)\d\d)[-/]((?:19|20)\d\d)(?!\d)/y)
  if (x && Number(x[2]) > Number(x[1]) && Number(x[2]) - Number(x[1]) <= 10) return { type: 'annees', fin: pos + x[0].length }
  x = essai(/([01]?\d|2[0-3]):[0-5]\d(?!\d)/y)
  if (x) return { type: 'heure', fin: pos + x[0].length }
  // Montant groupé par milliers : le plus long qui finit par « 000 » et compte 10 chiffres au plus.
  x = essai(/[1-9]\d{0,2}(?=([ .])\d{3}(?!\d))/y)
  if (x) {
    const sep = x[1]
    let fin = pos + x[0].length
    let chiffres = x[0].length
    let retenu = 0
    const groupe = new RegExp(`\\${sep}(\\d{3})(?!\\d)`, 'y')
    for (;;) {
      groupe.lastIndex = fin
      const g = groupe.exec(s)
      if (!g || chiffres + 3 > 10) break
      fin += g[0].length
      chiffres += 3
      if (g[1] === '000') retenu = fin
    }
    if (retenu) return { type: 'montant', fin: retenu }
  }
  x = essai(/(?:19|20)\d\d(?!\d)/y)
  if (x) return { type: 'annee', fin: pos + x[0].length }
  x = essai(/\d{1,2}(?!\d)/y)
  if (x) return { type: 'petit', fin: pos + x[0].length }
  return null
}

// Deux éléments qui se suivent avec un seul signe entre eux (« 12/11/2026 14:30 », « 14:30-16:00 ») ; sinon il faut
// une virgule, un point-virgule ou un séparateur entouré d'espaces, comme dans une phrase.
const ENCHAINEMENTS = new Set(['date heure', 'heure heure', 'date date'])
const faible = (sep: string) => sep.length === 1 || /^\s+$/.test(sep)

/** Une suite de 8 chiffres ou plus est conservée seulement si elle se lit entièrement comme dates, heures ou montants. */
function suiteLegitime(suite: string): boolean {
  if (suite.startsWith('+')) return false
  let pos = 0
  let precedent: Jeton | null = null
  let sep = ''
  let petits = 0
  let annees = 0
  for (;;) {
    const j = jeton(suite, pos)
    if (!j) return false
    if (j.type === 'petit' && ++petits > 1) return false
    if (j.type === 'annee' && ++annees > 1) return false
    if (precedent && faible(sep)) {
      const paire = `${precedent.type} ${j.type}`
      // Deux montants à la suite seulement s'ils sont clairement séparés (« 500 000 - 1 000 000 »).
      if (!ENCHAINEMENTS.has(paire)) return false
      if (paire === 'date heure' ? sep !== ' ' : !/^[-/]$/.test(sep)) return false
    }
    pos = j.fin
    if (pos >= suite.length) return true
    const s = /\D+/y
    s.lastIndex = pos
    sep = s.exec(suite)![0]
    pos += sep.length
    precedent = j
  }
}

function numeros(n: string): Plage[] {
  const plages: Plage[] = []
  for (const x of n.matchAll(SUITE)) {
    const chiffres = x[0].replace(/\D/g, '').length
    if (chiffres >= 8 && !suiteLegitime(x[0])) plages.push([x.index, x.index + x[0].length])
  }
  return plages
}

// Nombres en toutes lettres : « zéro six soixante-six douze trente-quatre cinquante-six ».
const MOTS = 'z[ée]ro|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|septante|huitante|octante|nonante|cents?|mille'
const MOT = `(?<![\\p{L}\\d])(?:${MOTS})(?![\\p{L}\\d])`
const NOMBRE = `(?:${MOT}|(?<!\\d)\\d{1,4}(?!\\d))`
const ENTRE = `(?:\\s*[,;./-]\\s*|\\s+(?:et\\s+)?)`
const EN_LETTRES = new RegExp(`${NOMBRE}(?:${ENTRE}${NOMBRE}){2,}`, 'giu')
const UN_NOMBRE = new RegExp(NOMBRE, 'giu')
const UNITE = /^(?:z[ée]ro|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|cents?|mille)$/i

function enLettres(n: string): Plage[] {
  const plages: Plage[] = []
  for (const x of n.matchAll(EN_LETTRES)) {
    const nombres = x[0].match(UN_NOMBRE) ?? []
    const mots = nombres.filter((t) => !/^\d/.test(t)).length
    // « six » vaut un chiffre, « douze » ou « soixante » deux, « 612 » trois.
    const chiffres = nombres.reduce((s, t) => s + (/^\d/.test(t) ? t.length : UNITE.test(t) ? 1 : 2), 0)
    if (mots >= 2 && chiffres >= 8) plages.push([x.index, x.index + x[0].length])
  }
  return plages
}

// --- Adresses e-mail -------------------------------------------------------------------------------------------------

// Longueurs bornées (64 et 63, comme les adresses réelles) : le temps de recherche reste proportionnel au texte.
const LOCAL = '[\\p{L}\\d._%+-]{1,64}'
const LABEL = '[\\p{L}\\d-]{1,63}'
// « @ », « ＠ » (ramené à « @ »), « [@] », « (@) » : sans ambiguïté, même sans domaine (« christelle @ gmail »).
const AROBASE = '\\s*(?:@|\\[\\s*@\\s*\\]|\\(\\s*@\\s*\\)|\\{\\s*@\\s*\\})\\s*'
// « (a) », « [at] », « at », « arobase », « chez » : seulement suivis d'un domaine (« kimia point cg », « kimia.cg »).
const AROBASE_MOT = '\\s*[([{]\\s*(?:a|at|arobase)\\s*[)\\]}]\\s*|\\s+(?:at|arobase|chez)\\s+'
const POINT_MOT = '\\s*[([{]\\s*(?:dot|point)\\s*[)\\]}]\\s*|\\s*\\.\\s*|\\s+(?:dot|point)\\s+'
// Extensions reconnues après un « point » écrit en toutes lettres ou espacé (« de » exclu : « point de vente »).
const EXTENSION =
  '(?:cg|cd|cm|ci|ga|sn|ma|tn|dz|bj|tg|bf|ml|ne|td|cf|gq|ao|com|fr|org|net|info|biz|io|co|be|ch|ca|eu|uk|us|africa|edu|gouv|gov|pro|online|site|xyz|app|dev)(?![\\p{L}\\d-])'
const DOMAINE = `${LABEL}(?:\\.${LABEL})*(?:${POINT_MOT})${EXTENSION}|${LABEL}(?:\\.${LABEL})+`
const EMAIL = new RegExp(`${LOCAL}(?:(?:${AROBASE})(?:${DOMAINE}|${LABEL})|(?:${AROBASE_MOT})(?:${DOMAINE}))`, 'giu')

// --- Messageries -----------------------------------------------------------------------------------------------------

// Point d'un nom de domaine, éventuellement espacé ou écrit (« wa . me », « instagram point com »).
const P = '(?:\\s*\\.\\s*|\\s*[([{]\\s*(?:dot|point)\\s*[)\\]}]\\s*|\\s+(?:dot|point)\\s+)'
const SERVICES = [
  `(?:(?:api|chat|web)${P})?whatsapp${P}com`,
  `telegram${P}(?:me|org|dog)`,
  `signal${P}(?:me|group)`,
  `instagram${P}com`,
  `instagr${P}am`,
  `facebook${P}com`,
  `fb${P}(?:com|watch)`,
  `messenger${P}com`,
  `snapchat${P}com`,
  `tiktok${P}com`,
  `linkedin${P}com\\s*\\/\\s*in(?![\\p{L}\\d])`,
]
// Domaines courts (« t.me », « m.me », « wa.me », « fb.me ») : point collé, ou suivis d'un chemin s'ils sont espacés.
const COURTS = `(?:t|m|wa|fb)(?:\\.me|${P}me(?=\\s*\\/))`
const LIEN = new RegExp(
  `(?<![\\p{L}\\d])(?:https?:\\/\\/)?(?:www\\.|m\\.|web\\.)?(?:${[...SERVICES, COURTS].join('|')})(?![\\p{L}\\d])(?:\\s*\\/\\S*)?`,
  'giu',
)
// « telegram @kimia242 », « insta : @kimia » : l'identifiant qui suit le nom d'une messagerie.
const MESSAGERIES = 'whatsapp|telegram|signal|instagram|insta|facebook|fb|messenger|snapchat|snap|tiktok|linkedin|twitter'
const IDENTIFIANT = new RegExp(`(?<=(?<![\\p{L}\\d])(?:${MESSAGERIES})(?![\\p{L}\\d])[^\\n@]{0,20})@\\s?[\\p{L}\\d._-]+`, 'giu')

// --- Remplacement ----------------------------------------------------------------------------------------------------

const plagesDe = (n: string, re: RegExp): Plage[] => [...n.matchAll(re)].map((x) => [x.index, x.index + x[0].length] as Plage)

export function masquerCoordonnees(texte: string): string {
  if (!texte) return texte
  const { n, debut, fin } = normaliser(texte)
  const plages = [...plagesDe(n, LIEN), ...plagesDe(n, EMAIL), ...plagesDe(n, IDENTIFIANT), ...numeros(lettresEnChiffres(n)), ...enLettres(n)]
    .filter(([a, b]) => b > a)
    .map(([a, b]) => [debut[a], fin[b - 1]] as Plage)
    .sort((x, y) => x[0] - y[0])
  if (!plages.length) return texte
  let sortie = ''
  let curseur = 0
  let courante: Plage | null = null
  for (const p of plages) {
    if (courante && p[0] <= courante[1]) courante[1] = Math.max(courante[1], p[1])
    else {
      if (courante) {
        sortie += texte.slice(curseur, courante[0]) + COORDONNEE_MASQUEE
        curseur = courante[1]
      }
      courante = [...p]
    }
  }
  sortie += texte.slice(curseur, courante![0]) + COORDONNEE_MASQUEE + texte.slice(courante![1])
  return sortie
}
