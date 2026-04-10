import { isSafeEditorialHref } from "@/lib/static-pages/editorialMarkdown"

export type HomeFixedTextInlineNode =
  | {
      type: "text"
      value: string
    }
  | {
      type: "link"
      label: string
      href: string
    }
  | {
      type: "strong"
      value: string
    }
  | {
      type: "italic"
      value: string
    }

const INLINE_MARKDOWN_PATTERN =
  /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g

export function splitHomeFixedTextParagraphs(markdown: string): string[] {
  if (!markdown.trim()) {
    return []
  }

  return markdown
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

export function parseHomeFixedTextInlineNodes(
  rawText: string,
): HomeFixedTextInlineNode[] {
  if (!rawText) {
    return []
  }

  const inlineNodes: HomeFixedTextInlineNode[] = []
  let previousLastIndex = 0

  for (const match of rawText.matchAll(INLINE_MARKDOWN_PATTERN)) {
    const fullMatch = match[0]
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

    const linkLabel = match[2]?.trim()
    const linkHref = match[3]?.trim()
    const strongValue = match[4]?.trim()
    const italicValue = match[5]?.trim()

    if (linkLabel && linkHref) {
      if (isSafeEditorialHref(linkHref)) {
        inlineNodes.push({
          type: "link",
          label: linkLabel,
          href: linkHref,
        })
      } else {
        inlineNodes.push({
          type: "text",
          value: fullMatch,
        })
      }
    } else if (strongValue) {
      inlineNodes.push({
        type: "strong",
        value: strongValue,
      })
    } else if (italicValue) {
      inlineNodes.push({
        type: "italic",
        value: italicValue,
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
