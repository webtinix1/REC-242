type Node = { type?: string; text?: string; children?: Node[] }

/** Texte brut d'un contenu riche Lexical (extraits, recherche). */
export const plainText = (data?: unknown): string => {
  const walk = (n?: Node): string =>
    (n?.text ?? '') + (n?.children ?? []).map(walk).join(n?.type === 'root' ? '\n' : '')
  return walk((data as { root?: Node } | undefined)?.root).trim()
}
