"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import {
  parseHomeFixedTextInlineNodes,
  splitHomeFixedTextParagraphs,
} from "@/lib/home-fixed-text/richText"
import { useHomeFixedText } from "@/features/home/fixedText/useHomeFixedText"

function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//")
}

function InlineHomeFixedText({ text }: { text: string }) {
  const inlineNodes = useMemo(() => parseHomeFixedTextInlineNodes(text), [text])

  return (
    <>
      {inlineNodes.map((node, nodeIndex) => {
        const nodeKey = `${node.type}-${nodeIndex}`

        if (node.type === "text") {
          return <span key={nodeKey}>{node.value}</span>
        }

        if (node.type === "strong") {
          return <strong key={nodeKey}>{node.value}</strong>
        }

        if (node.type === "italic") {
          return <em key={nodeKey}>{node.value}</em>
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

function ParagraphLines({ paragraph }: { paragraph: string }) {
  const lines = paragraph.split("\n")

  return (
    <>
      {lines.map((line, lineIndex) => {
        const lineKey = `${line}-${lineIndex}`

        return (
          <span key={lineKey}>
            <InlineHomeFixedText text={line} />
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        )
      })}
    </>
  )
}

export function HomeFixedText() {
  const locale = useLocale()
  const translateHomeFixedText = useTranslations("HomeFixedText")
  const { homeFixedTextPayload, isHomeFixedTextLoading } =
    useHomeFixedText(locale)

  const hasContent =
    (homeFixedTextPayload?.contentMarkdown?.trim().length ?? 0) > 0

  const hasTitle = (homeFixedTextPayload?.title?.trim().length ?? 0) > 0

  const paragraphs = useMemo(() => {
    if (!hasContent) {
      return []
    }

    return splitHomeFixedTextParagraphs(
      homeFixedTextPayload?.contentMarkdown ?? "",
    )
  }, [hasContent, homeFixedTextPayload?.contentMarkdown])

  if (isHomeFixedTextLoading) {
    return (
      <section className="container pb-10 sm:pb-14">
        <Card className="border-border/80" aria-live="polite">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-brand-nav" role="status">
              {translateHomeFixedText("loading")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200" />
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!hasContent || paragraphs.length === 0) {
    return null
  }

  return (
    <section className="container pb-10 sm:pb-14">
      <article
        aria-labelledby={hasTitle ? "home-fixed-text-title" : undefined}
        className="rounded-2xl border border-border/80 bg-white px-5 py-4 sm:px-7 sm:py-6"
      >
        {hasTitle ? (
          <h2
            id="home-fixed-text-title"
            className="heading-font text-2xl tracking-tight text-brand-nav sm:text-3xl"
          >
            {homeFixedTextPayload?.title}
          </h2>
        ) : null}

        <div className={hasTitle ? "mt-3 space-y-3" : "space-y-3"}>
          {paragraphs.map((paragraph, paragraphIndex) => (
            <p
              key={`${paragraphIndex}-${paragraph}`}
              className="break-words text-sm leading-relaxed text-slate-700 sm:text-base"
            >
              <ParagraphLines paragraph={paragraph} />
            </p>
          ))}
        </div>
      </article>
    </section>
  )
}
