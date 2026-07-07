const URL_PATTERN = /https?:\/\/[^\s]+/g
const TRAILING_PUNCTUATION = /[.,;:!?)\]}"'’”]+$/

function shortenUrl(url: string, maxLength = 45) {
  if (url.length <= maxLength) return url
  try {
    const { hostname, pathname, search, hash } = new URL(url)
    const host = hostname.replace(/^www\./, '')
    const rest = pathname + search + hash
    const budget = maxLength - host.length - 1
    return budget > 0 ? `${host}${rest.slice(0, budget)}…` : `${host}…`
  } catch {
    return `${url.slice(0, maxLength)}…`
  }
}

/** Renders plain text with any http(s) URLs turned into short, clickable links. */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = URL_PATTERN.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))

    let url = match[0]
    const trailing = url.match(TRAILING_PUNCTUATION)?.[0] ?? ''
    if (trailing) url = url.slice(0, -trailing.length)

    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all hover:no-underline"
      >
        {shortenUrl(url)}
      </a>
    )
    if (trailing) nodes.push(trailing)

    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))

  return <span className={className}>{nodes}</span>
}
