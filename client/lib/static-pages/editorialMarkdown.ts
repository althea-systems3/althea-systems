export type EditorialInlineNode =
  | {
      type: "text"
      value: string
    }
  | {
      type: "link"
      label: string
      href: string
    }

export type EditorialMarkdownBlock =
  | {
      type: "h2"
      text: string
    }
  | {
      type: "h3"
      text: string
    }
  | {
      type: "paragraph"
      text: string
    }
  | {
      type: "list"
      ordered: boolean
      items: string[]
    }

const INLINE_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g

function normalizeEditorialMarkdown(markdown: string): string {
  const normalizedLineBreaks = markdown
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")

  // Legacy seed data can contain escaped line breaks ("\\n") instead of real new lines.
  if (normalizedLineBreaks.includes("\n")) {
    return normalizedLineBreaks
  }

  return normalizedLineBreaks
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n")
}

export function isSafeEditorialHref(rawHref: string): boolean {
  const href = rawHref.trim().toLowerCase()

  return (
    href.startsWith("/") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  )
}

export function parseEditorialInlineNodes(
  rawText: string,
): EditorialInlineNode[] {
  if (!rawText) {
    return []
  }

  const inlineNodes: EditorialInlineNode[] = []
  let previousLastIndex = 0

  for (const match of rawText.matchAll(INLINE_LINK_PATTERN)) {
    const fullMatch = match[0]
    const label = match[1]?.trim() ?? ""
    const href = match[2]?.trim() ?? ""
    const matchIndex = match.index ?? -1

    if (!fullMatch || matchIndex < 0) {
      continue
    }

    if (matchIndex > previousLastIndex) {
      inlineNodes.push({
        type: "text",
        value: rawText.slice(previousLastIndex, matchIndex),
      })
    }

    if (label && href && isSafeEditorialHref(href)) {
      inlineNodes.push({
        type: "link",
        label,
        href,
      })
    } else {
      inlineNodes.push({
        type: "text",
        value: fullMatch,
      })
    }

    previousLastIndex = matchIndex + fullMatch.length
  }

  if (previousLastIndex < rawText.length) {
    inlineNodes.push({
      type: "text",
      value: rawText.slice(previousLastIndex),
    })
  }

  if (inlineNodes.length === 0) {
    return [
      {
        type: "text",
        value: rawText,
      },
    ]
  }

  return inlineNodes
}

export function parseEditorialMarkdown(
  markdown: string,
): EditorialMarkdownBlock[] {
  const normalized = normalizeEditorialMarkdown(markdown).trim()

  if (!normalized) {
    return []
  }

  const lines = normalized.split("\n")
  const blocks: EditorialMarkdownBlock[] = []

  let paragraphLines: string[] = []
  let listItems: string[] = []
  let isOrderedList = false

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    const paragraphText = paragraphLines.join(" ").trim()

    if (paragraphText) {
      blocks.push({
        type: "paragraph",
        text: paragraphText,
      })
    }

    paragraphLines = []
  }

  const flushList = () => {
    if (listItems.length === 0) {
      return
    }

    blocks.push({
      type: "list",
      ordered: isOrderedList,
      items: listItems,
    })

    listItems = []
    isOrderedList = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith("### ")) {
      flushParagraph()
      flushList()

      blocks.push({
        type: "h3",
        text: line.slice(4).trim(),
      })
      continue
    }

    if (line.startsWith("## ")) {
      flushParagraph()
      flushList()

      blocks.push({
        type: "h2",
        text: line.slice(3).trim(),
      })
      continue
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/)

    if (unorderedMatch?.[1]) {
      flushParagraph()

      if (listItems.length === 0) {
        isOrderedList = false
      }

      if (isOrderedList) {
        flushList()
        isOrderedList = false
      }

      listItems.push(unorderedMatch[1].trim())
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/)

    if (orderedMatch?.[1]) {
      flushParagraph()

      if (listItems.length === 0) {
        isOrderedList = true
      }

      if (!isOrderedList) {
        flushList()
        isOrderedList = true
      }

      listItems.push(orderedMatch[1].trim())
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}
