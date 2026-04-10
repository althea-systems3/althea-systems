import { describe, expect, it } from "vitest"

import {
  parseHomeFixedTextInlineNodes,
  splitHomeFixedTextParagraphs,
} from "@/lib/home-fixed-text/richText"

describe("home fixed text rich parser", () => {
  it("splits markdown into paragraphs", () => {
    const paragraphs = splitHomeFixedTextParagraphs(
      "Premier paragraphe\n\nDeuxieme paragraphe",
    )

    expect(paragraphs).toEqual(["Premier paragraphe", "Deuxieme paragraphe"])
  })

  it("parses link strong and italic nodes", () => {
    const nodes = parseHomeFixedTextInlineNodes(
      "Texte **important** et *nuance* avec [contact](/contact).",
    )

    expect(nodes.some((node) => node.type === "strong")).toBe(true)
    expect(nodes.some((node) => node.type === "italic")).toBe(true)
    expect(nodes.some((node) => node.type === "link")).toBe(true)
  })

  it("keeps unsafe links as plain text", () => {
    const nodes = parseHomeFixedTextInlineNodes(
      "Lien [dangereux](javascript:alert('x')).",
    )

    const hasUnsafeLinkNode = nodes.some((node) => node.type === "link")

    expect(hasUnsafeLinkNode).toBe(false)
  })
})
