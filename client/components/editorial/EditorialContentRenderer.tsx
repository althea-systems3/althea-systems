"use client"

import { Link } from "@/i18n/navigation"
import {
  parseEditorialInlineNodes,
  parseEditorialMarkdown,
  type EditorialInlineNode,
} from "@/lib/static-pages/editorialMarkdown"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

type EditorialContentRendererProps = {
  markdown: string
  className?: string
}

function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//")
}

function InlineContent({ nodes }: { nodes: EditorialInlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const nodeKey = `${node.type}-${index}`

        if (node.type === "text") {
          return <span key={nodeKey}>{node.value}</span>
        }

        if (isInternalHref(node.href)) {
          return (
            <Link
              key={nodeKey}
              href={node.href}
              className="font-medium text-brand-cta underline underline-offset-4"
            >
              {node.label}
            </Link>
          )
        }

        return (
          <a
            key={nodeKey}
            href={node.href}
            target={node.href.startsWith("http") ? "_blank" : undefined}
            rel={
              node.href.startsWith("http") ? "noreferrer noopener" : undefined
            }
            className="font-medium text-brand-cta underline underline-offset-4"
          >
            {node.label}
          </a>
        )
      })}
    </>
  )
}

export function EditorialContentRenderer({
  markdown,
  className,
}: EditorialContentRendererProps) {
  const blocks = useMemo(() => parseEditorialMarkdown(markdown), [markdown])

  return (
    <article className={cn("space-y-5 sm:space-y-6", className)}>
      {blocks.map((block, blockIndex) => {
        const blockKey = `${block.type}-${blockIndex}`

        if (block.type === "h2") {
          return (
            <h2
              key={blockKey}
              className="heading-font text-2xl text-brand-nav sm:text-3xl"
            >
              {block.text}
            </h2>
          )
        }

        if (block.type === "h3") {
          return (
            <h3
              key={blockKey}
              className="heading-font text-xl text-brand-nav sm:text-2xl"
            >
              {block.text}
            </h3>
          )
        }

        if (block.type === "list") {
          const listClassName =
            "space-y-2 ps-5 text-sm leading-relaxed text-slate-700 sm:text-base"

          if (block.ordered) {
            return (
              <ol key={blockKey} className={cn("list-decimal", listClassName)}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${blockKey}-item-${itemIndex}`}>
                    <InlineContent nodes={parseEditorialInlineNodes(item)} />
                  </li>
                ))}
              </ol>
            )
          }

          return (
            <ul key={blockKey} className={cn("list-disc", listClassName)}>
              {block.items.map((item, itemIndex) => (
                <li key={`${blockKey}-item-${itemIndex}`}>
                  <InlineContent nodes={parseEditorialInlineNodes(item)} />
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p
            key={blockKey}
            className="text-sm leading-relaxed text-slate-700 sm:text-base"
          >
            <InlineContent nodes={parseEditorialInlineNodes(block.text)} />
          </p>
        )
      })}
    </article>
  )
}
