import { getLocale } from "next-intl/server"

import { EditorialContentRenderer } from "@/components/editorial/EditorialContentRenderer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getPublicStaticPageContent } from "@/lib/static-pages/publicContent"
import { type StaticPageSlug } from "@/lib/static-pages/staticPages"

type PublicStaticPageProps = {
  slug: StaticPageSlug
  fallbackTitle: string
  fallbackDescription: string
}

type StaticPageStatusText = {
  empty: string
}

const STATUS_TEXT_BY_LOCALE: Record<string, StaticPageStatusText> = {
  fr: {
    empty: "Cette page ne contient pas encore de contenu publie.",
  },
  en: {
    empty: "This page does not contain any published content yet.",
  },
  es: {
    empty: "Esta pagina aun no contiene contenido publicado.",
  },
  ar: {
    empty: "This page does not contain any published content yet.",
  },
}

export async function PublicStaticPage({
  slug,
  fallbackTitle,
  fallbackDescription,
}: PublicStaticPageProps) {
  const locale = await getLocale()

  const statusText = STATUS_TEXT_BY_LOCALE[locale] ?? STATUS_TEXT_BY_LOCALE.fr

  const contentPayload = await getPublicStaticPageContent({
    slug,
    localeInput: locale,
  })

  const pageTitle = contentPayload.title.trim() || fallbackTitle
  const pageDescription =
    contentPayload.description?.trim() || fallbackDescription
  const hasEditorialContent = contentPayload.contentMarkdown.trim().length > 0

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <header className="rounded-2xl border border-border/80 bg-[#d4f4f7]/60 p-5 sm:p-7">
          <Badge
            variant="secondary"
            className="w-fit bg-[#d4f4f7] text-[#0a7490] hover:bg-[#c7edf1]"
          >
            Althea Systems
          </Badge>
          <h1 className="mt-2 heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-3 text-sm text-slate-700 sm:text-base">
            {pageDescription}
          </p>
        </header>

        {!hasEditorialContent ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-700 sm:text-base">
                {statusText.empty}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {hasEditorialContent ? (
          <Card className="border-border/80">
            <CardContent className="pt-6">
              <EditorialContentRenderer
                markdown={contentPayload.contentMarkdown}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
