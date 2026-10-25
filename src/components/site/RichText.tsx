import React from 'react'

type Node = {
  type: string
  tag?: string
  text?: string
  format?: number | string
  listType?: string
  url?: string
  fields?: { url?: string; newTab?: boolean }
  children?: Node[]
}

/** Rendu du texte riche (Lexical) avec les classes de la maquette : intertitres « h-m », paragraphes simples. */
const render = (nodes: Node[] | undefined, key = ''): React.ReactNode =>
  (nodes ?? []).map((n, i) => {
    const k = `${key}${i}`
    switch (n.type) {
      case 'text': {
        let el: React.ReactNode = n.text
        const f = typeof n.format === 'number' ? n.format : 0
        if (f & 1) el = <strong>{el}</strong>
        if (f & 2) el = <em>{el}</em>
        if (f & 8) el = <u>{el}</u>
        return <React.Fragment key={k}>{el}</React.Fragment>
      }
      case 'linebreak':
        return <br key={k} />
      case 'paragraph':
        return <p key={k}>{render(n.children, k)}</p>
      case 'heading': {
        const level = n.tag === 'h3' || n.tag === 'h4' ? 'h3' : 'h2'
        return React.createElement(
          level,
          { key: k, className: level === 'h2' ? 'h-m' : 'h-s' },
          render(n.children, k),
        )
      }
      case 'list':
        return React.createElement(
          n.listType === 'number' ? 'ol' : 'ul',
          { key: k },
          render(n.children, k),
        )
      case 'listitem':
        return <li key={k}>{render(n.children, k)}</li>
      case 'quote':
        return <blockquote key={k}>{render(n.children, k)}</blockquote>
      case 'link':
      case 'autolink': {
        const url = n.fields?.url || n.url || '#'
        const ext = /^https?:\/\//.test(url)
        return (
          <a
            key={k}
            href={url}
            {...(ext || n.fields?.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {render(n.children, k)}
          </a>
        )
      }
      default:
        return n.children ? <React.Fragment key={k}>{render(n.children, k)}</React.Fragment> : null
    }
  })

export const RichText = ({ data }: { data?: unknown }) => {
  const root = (data as { root?: Node } | undefined)?.root
  return root ? <>{render(root.children)}</> : null
}
